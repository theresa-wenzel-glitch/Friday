import {
  answerQuestionSchema,
  availabilityScheduleSchema,
  businessProfileSchema,
  businessServiceSchema,
  createAppointmentSchema,
  createOfferSchema,
  createRequestSchema,
  createReviewSchema,
  loginSchema,
  object,
  oneOf,
  paginationSchema,
  registerSchema,
  sendMessageSchema,
  string,
  updateRequestSchema,
  uuid,
  withDefault,
} from "@jobflow/validation";
import { JOB_STATUSES } from "@jobflow/types";
import { ApiError } from "./http/errors.js";
import { RATE_LIMITS } from "./http/rate-limit.js";
import { Router } from "./http/router.js";
import type { RequestContext } from "./http/context.js";

/**
 * Alle Routen der API.
 *
 * Jeder Handler sagt in seiner ersten Zeile, wer ihn aufrufen darf. Wo
 * `requireUser` oder `requireRole` fehlt, ist der Endpunkt öffentlich - und
 * das soll man ihm auf einen Blick ansehen.
 */
export function buildRouter(): Router {
  const router = new Router();

  router.get("/health", async () => ({ status: "ok" }));

  router.mount("/auth", authRoutes());
  router.mount("/categories", categoryRoutes());
  router.mount("/requests", requestRoutes());
  router.mount("/businesses", businessRoutes());
  router.mount("/offers", offerRoutes());
  router.mount("/appointments", appointmentRoutes());
  router.mount("/jobs", jobRoutes());
  router.mount("/conversations", conversationRoutes());
  router.mount("/reviews", reviewRoutes());
  router.mount("/matches", matchRoutes());
  router.mount("/me", meRoutes());

  return router;
}

function limit(ctx: RequestContext, bucket: keyof typeof RATE_LIMITS, key: string): void {
  const rule = RATE_LIMITS[bucket];
  if (!ctx.app.rateLimiter.check(`${bucket}:${key}`, rule)) {
    ctx.res.setHeader("retry-after", String(ctx.app.rateLimiter.retryAfterSeconds(`${bucket}:${key}`)));
    throw ApiError.rateLimited();
  }
}

// --- Authentifizierung -----------------------------------------------------

function authRoutes(): Router {
  const router = new Router();

  router.post("/register", async (ctx) => {
    // Die Registrierung ist besonders streng begrenzt: hier werden sonst
    // massenhaft Konten angelegt.
    limit(ctx, "auth", ctx.ipPrefix);
    const input = await ctx.input(registerSchema);
    return ctx.app.auth.register(input, ctx.ipPrefix);
  });

  router.post("/login", async (ctx) => {
    limit(ctx, "auth", ctx.ipPrefix);
    const input = await ctx.input(loginSchema);
    return ctx.app.auth.login(input.email, input.password, ctx.ipPrefix);
  });

  router.post("/logout", async (ctx) => {
    const principal = await ctx.requireUser();
    await ctx.app.auth.logout(principal.sessionId);
    return { loggedOut: true };
  });

  router.post("/logout-all", async (ctx) => {
    const principal = await ctx.requireUser();
    await ctx.app.auth.logoutEverywhere(principal.user.id);
    return { loggedOut: true };
  });

  return router;
}

function meRoutes(): Router {
  const router = new Router();

  router.get("/", async (ctx) => {
    const principal = await ctx.requireUser();
    return principal.user;
  });

  return router;
}

// --- Kategorien ------------------------------------------------------------

function categoryRoutes(): Router {
  const router = new Router();

  // Öffentlich: die Kategorien sind der Einstieg in die App und enthalten
  // keine personenbezogenen Daten.
  router.get("/", async (ctx) => ctx.app.categories.list());
  router.get("/tree", async (ctx) => ctx.app.categories.tree());

  return router;
}

// --- Anfragen --------------------------------------------------------------

function requestRoutes(): Router {
  const router = new Router();

  router.post("/", async (ctx) => {
    const principal = await ctx.requireRole("CUSTOMER");
    limit(ctx, "write", principal.user.id);
    const input = await ctx.input(createRequestSchema);
    return ctx.app.requests.create(principal.user.id, input);
  });

  router.get("/", async (ctx) => {
    const principal = await ctx.requireRole("CUSTOMER");
    const page = ctx.queryInput(paginationSchema);
    return ctx.app.requests.listForCustomer(principal.user.id, page.limit, page.offset);
  });

  router.get("/:id", async (ctx) => {
    const principal = await ctx.requireUser();
    return ctx.app.requests.getForUser(ctx.param("id"), principal.user.id);
  });

  router.patch("/:id", async (ctx) => {
    const principal = await ctx.requireRole("CUSTOMER");
    limit(ctx, "write", principal.user.id);
    const input = await ctx.input(updateRequestSchema);
    return ctx.app.requests.update(ctx.param("id"), principal.user.id, input);
  });

  router.delete("/:id", async (ctx) => {
    const principal = await ctx.requireRole("CUSTOMER");
    return ctx.app.requests.cancel(ctx.param("id"), principal.user.id);
  });

  // KI-Analyse.
  router.post("/:id/analyze", async (ctx) => {
    const principal = await ctx.requireRole("CUSTOMER");
    limit(ctx, "ai", principal.user.id);
    return ctx.app.ai.analyze(ctx.param("id"), principal.user.id);
  });

  router.get("/:id/analysis", async (ctx) => {
    const principal = await ctx.requireUser();
    const analysis = await ctx.app.ai.latest(ctx.param("id"), principal.user.id);
    if (analysis === null) throw ApiError.notFound("Zu dieser Anfrage gibt es noch keine Analyse.");
    return analysis;
  });

  router.post("/:id/questions/:questionId", async (ctx) => {
    const principal = await ctx.requireRole("CUSTOMER");
    const input = await ctx.input(answerQuestionSchema);
    return ctx.app.ai.answerQuestion(ctx.param("questionId"), principal.user.id, input.answer);
  });

  // Matching.
  router.post("/:id/matches", async (ctx) => {
    const principal = await ctx.requireRole("CUSTOMER");
    limit(ctx, "write", principal.user.id);
    return ctx.app.matching.generate(ctx.param("id"), principal.user.id);
  });

  router.get("/:id/matches", async (ctx) => {
    const principal = await ctx.requireRole("CUSTOMER");
    return ctx.app.matching.listForRequest(ctx.param("id"), principal.user.id);
  });

  router.get("/:id/offers", async (ctx) => {
    const principal = await ctx.requireRole("CUSTOMER");
    return ctx.app.offers.listForRequest(ctx.param("id"), principal.user.id);
  });

  return router;
}

// --- Unternehmen -----------------------------------------------------------

function businessRoutes(): Router {
  const router = new Router();

  // Das eigene Unternehmen. Steht vor "/:id", damit "me" nicht als ID gelesen wird.
  router.get("/me", async (ctx) => {
    const principal = await ctx.requireRole("BUSINESS", "BUSINESS_EMPLOYEE");
    const membership = await ctx.app.businesses.requireMembership(principal.user.id);
    return ctx.app.businesses.get(membership.businessId);
  });

  router.patch("/me", async (ctx) => {
    const principal = await ctx.requireRole("BUSINESS");
    const businessId = await ctx.app.businesses.requireOwner(principal.user.id);
    const input = await ctx.input(businessProfileSchema);
    return ctx.app.businesses.updateProfile(businessId, input);
  });

  router.get("/me/statistics", async (ctx) => {
    const principal = await ctx.requireRole("BUSINESS", "BUSINESS_EMPLOYEE");
    const membership = await ctx.app.businesses.requireMembership(principal.user.id);
    return ctx.app.businesses.statistics(membership.businessId);
  });

  router.get("/me/services", async (ctx) => {
    const principal = await ctx.requireRole("BUSINESS", "BUSINESS_EMPLOYEE");
    const membership = await ctx.app.businesses.requireMembership(principal.user.id);
    return ctx.app.businesses.listServices(membership.businessId);
  });

  router.post("/me/services", async (ctx) => {
    const principal = await ctx.requireRole("BUSINESS");
    const businessId = await ctx.app.businesses.requireOwner(principal.user.id);
    const input = await ctx.input(businessServiceSchema);
    return ctx.app.businesses.addService(businessId, input);
  });

  router.delete("/me/services/:serviceId", async (ctx) => {
    const principal = await ctx.requireRole("BUSINESS");
    const businessId = await ctx.app.businesses.requireOwner(principal.user.id);
    await ctx.app.businesses.removeService(businessId, ctx.param("serviceId"));
    return { removed: true };
  });

  router.get("/me/availability", async (ctx) => {
    const principal = await ctx.requireRole("BUSINESS", "BUSINESS_EMPLOYEE");
    const membership = await ctx.app.businesses.requireMembership(principal.user.id);
    return ctx.app.businesses.getAvailability(membership.businessId);
  });

  router.post("/me/availability", async (ctx) => {
    const principal = await ctx.requireRole("BUSINESS");
    const businessId = await ctx.app.businesses.requireOwner(principal.user.id);
    const input = await ctx.input(availabilityScheduleSchema);
    return ctx.app.businesses.setAvailability(businessId, input);
  });

  // Die Anfragen, die dem Unternehmen vorgeschlagen wurden.
  router.get("/me/matches", async (ctx) => {
    const principal = await ctx.requireRole("BUSINESS", "BUSINESS_EMPLOYEE");
    const membership = await ctx.app.businesses.requireMembership(principal.user.id);
    const page = ctx.queryInput(paginationSchema);
    return ctx.app.matching.listForBusiness(membership.businessId, page.limit, page.offset);
  });

  router.get("/me/offers", async (ctx) => {
    const principal = await ctx.requireRole("BUSINESS", "BUSINESS_EMPLOYEE");
    const membership = await ctx.app.businesses.requireMembership(principal.user.id);
    const page = ctx.queryInput(paginationSchema);
    return ctx.app.offers.listForBusiness(membership.businessId, page.limit, page.offset);
  });

  // Öffentliches Profil.
  router.get("/:id", async (ctx) => ctx.app.businesses.get(ctx.param("id")));

  router.get("/:id/reviews", async (ctx) => {
    const page = ctx.queryInput(paginationSchema);
    return ctx.app.reviews.listForBusiness(ctx.param("id"), page.limit, page.offset);
  });

  router.get("/:id/availability", async (ctx) => {
    // Freie Zeitfenster darf nur sehen, wer angemeldet ist - sonst wäre der
    // Kalender eines Betriebs frei auslesbar.
    await ctx.requireUser();
    return ctx.app.appointments.availableSlots(ctx.param("id"));
  });

  return router;
}

// --- Matching --------------------------------------------------------------

const matchResponseSchema = object({ status: oneOf(["ACCEPTED", "DECLINED"] as const) });

function matchRoutes(): Router {
  const router = new Router();

  router.post("/:id/respond", async (ctx) => {
    const principal = await ctx.requireRole("BUSINESS", "BUSINESS_EMPLOYEE");
    const membership = await ctx.app.businesses.requireMembership(principal.user.id);
    const input = await ctx.input(matchResponseSchema);
    return ctx.app.matching.respond(ctx.param("id"), membership.businessId, input.status);
  });

  return router;
}

// --- Angebote --------------------------------------------------------------

const offerSuggestionSchema = object({ context: string({ min: 3, max: 2000 }) });

function offerRoutes(): Router {
  const router = new Router();

  router.post("/", async (ctx) => {
    const principal = await ctx.requireRole("BUSINESS", "BUSINESS_EMPLOYEE");
    limit(ctx, "write", principal.user.id);
    const membership = await ctx.app.businesses.requireMembership(principal.user.id);
    const input = await ctx.input(createOfferSchema);
    return ctx.app.offers.create(membership.businessId, principal.user.id, input);
  });

  /**
   * Textvorschlag für ein Angebot.
   *
   * Der Vorschlag wird zurückgegeben, nicht abgeschickt: über Preis und
   * Inhalt entscheidet das Unternehmen.
   */
  router.post("/suggest-text", async (ctx) => {
    const principal = await ctx.requireRole("BUSINESS", "BUSINESS_EMPLOYEE");
    limit(ctx, "ai", principal.user.id);
    const input = await ctx.input(offerSuggestionSchema);
    return { text: await ctx.app.ai.suggestOfferText(input.context), isAiGenerated: true };
  });

  router.get("/:id", async (ctx) => {
    const principal = await ctx.requireUser();
    return ctx.app.offers.get(ctx.param("id"), principal.user.id);
  });

  router.post("/:id/accept", async (ctx) => {
    const principal = await ctx.requireRole("CUSTOMER");
    limit(ctx, "write", principal.user.id);
    return ctx.app.offers.accept(ctx.param("id"), principal.user.id, ctx.ipPrefix);
  });

  router.post("/:id/decline", async (ctx) => {
    const principal = await ctx.requireRole("CUSTOMER");
    return ctx.app.offers.decline(ctx.param("id"), principal.user.id);
  });

  router.post("/:id/withdraw", async (ctx) => {
    const principal = await ctx.requireRole("BUSINESS", "BUSINESS_EMPLOYEE");
    const membership = await ctx.app.businesses.requireMembership(principal.user.id);
    return ctx.app.offers.withdraw(ctx.param("id"), membership.businessId);
  });

  return router;
}

// --- Termine ---------------------------------------------------------------

function appointmentRoutes(): Router {
  const router = new Router();

  router.post("/", async (ctx) => {
    const principal = await ctx.requireUser();
    limit(ctx, "write", principal.user.id);
    const input = await ctx.input(createAppointmentSchema);
    return ctx.app.appointments.create(principal.user.id, input);
  });

  router.get("/:id", async (ctx) => {
    const principal = await ctx.requireUser();
    return ctx.app.appointments.get(ctx.param("id"), principal.user.id);
  });

  router.delete("/:id", async (ctx) => {
    const principal = await ctx.requireUser();
    return ctx.app.appointments.cancel(ctx.param("id"), principal.user.id);
  });

  return router;
}

// --- Aufträge -------------------------------------------------------------

const jobStatusSchema = object({ status: oneOf(JOB_STATUSES) });

function jobRoutes(): Router {
  const router = new Router();

  router.get("/", async (ctx) => {
    const principal = await ctx.requireUser();
    const page = ctx.queryInput(paginationSchema);
    return ctx.app.jobs.listForUser(principal.user.id, page.limit, page.offset);
  });

  router.get("/:id", async (ctx) => {
    const principal = await ctx.requireUser();
    return ctx.app.jobs.get(ctx.param("id"), principal.user.id);
  });

  router.patch("/:id/status", async (ctx) => {
    const principal = await ctx.requireUser();
    const input = await ctx.input(jobStatusSchema);
    return ctx.app.jobs.setStatus(ctx.param("id"), principal.user.id, input.status);
  });

  return router;
}

// --- Chat ------------------------------------------------------------------

const chatSuggestionSchema = object({
  context: string({ min: 3, max: 2000 }),
  hint: withDefault(string({ min: 1, max: 500 }), ""),
});

function conversationRoutes(): Router {
  const router = new Router();

  router.get("/", async (ctx) => {
    const principal = await ctx.requireUser();
    return ctx.app.conversations.listForUser(principal.user.id);
  });

  router.get("/:id", async (ctx) => {
    const principal = await ctx.requireUser();
    return ctx.app.conversations.get(ctx.param("id"), principal.user.id);
  });

  router.get("/:id/messages", async (ctx) => {
    const principal = await ctx.requireUser();
    const page = ctx.queryInput(paginationSchema);
    return ctx.app.conversations.listMessages(ctx.param("id"), principal.user.id, page.limit, page.offset);
  });

  router.post("/:id/messages", async (ctx) => {
    const principal = await ctx.requireUser();
    limit(ctx, "write", principal.user.id);
    const input = await ctx.input(sendMessageSchema);
    return ctx.app.conversations.sendMessage(
      ctx.param("id"),
      principal.user.id,
      input.body,
      input.isAiGenerated,
    );
  });

  router.post("/:id/suggest-reply", async (ctx) => {
    const principal = await ctx.requireUser();
    limit(ctx, "ai", principal.user.id);
    // Die Beteiligung wird geprüft, bevor irgendein Kontext an die KI geht.
    await ctx.app.conversations.get(ctx.param("id"), principal.user.id);
    const input = await ctx.input(chatSuggestionSchema);
    const text = await ctx.app.ai.suggestChatReply(input.context, input.hint || undefined);
    return { text, isAiGenerated: true };
  });

  return router;
}

// --- Bewertungen -----------------------------------------------------------

function reviewRoutes(): Router {
  const router = new Router();

  router.post("/", async (ctx) => {
    const principal = await ctx.requireRole("CUSTOMER");
    limit(ctx, "write", principal.user.id);
    const input = await ctx.input(createReviewSchema);
    return ctx.app.reviews.create(principal.user.id, input);
  });

  return router;
}

export { uuid };
