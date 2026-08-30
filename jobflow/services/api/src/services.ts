import type { IncomingMessage } from "node:http";
import type { Config } from "./config.js";
import { createPool, type Db } from "./db/pool.js";
import type { Principal } from "./http/context.js";
import { RateLimiter } from "./http/rate-limit.js";
import type { Logger } from "./lib/logger.js";
import { createLogger } from "./lib/logger.js";
import { AiService } from "./modules/ai/service.js";
import type { AiProvider } from "./modules/ai/provider.js";
import { RulesAiProvider } from "./modules/ai/rules-provider.js";
import { RemoteAiProvider } from "./modules/ai/remote-provider.js";
import { AppointmentService } from "./modules/appointments/service.js";
import { AuthService } from "./modules/auth/service.js";
import { BusinessService } from "./modules/businesses/service.js";
import { CategoryService } from "./modules/categories/service.js";
import { ConversationService } from "./modules/conversations/service.js";
import { JobService } from "./modules/jobs/service.js";
import { MatchingService } from "./modules/matching/service.js";
import { OfferService } from "./modules/offers/service.js";
import { RequestService } from "./modules/requests/service.js";
import { ReviewService } from "./modules/reviews/service.js";

/**
 * Alle Dienste der Anwendung an einer Stelle.
 *
 * Das ist der modulare Monolith in Reinform: eine Anwendung, aber innen sauber
 * nach Fachbereichen getrennt. Kein Modul greift auf die Tabellen eines anderen
 * zu, sondern nur auf dessen Service. Wenn spaeter ein Bereich wirklich eigene
 * Ressourcen braucht, laesst er sich hier herausloesen - vorher waeren
 * Microservices nur zusaetzliche Arbeit ohne Nutzen.
 */
export interface AppServices {
  config: Config;
  db: Db;
  logger: Logger;
  rateLimiter: RateLimiter;
  aiProvider: AiProvider;

  auth: AuthService;
  categories: CategoryService;
  businesses: BusinessService;
  requests: RequestService;
  ai: AiService;
  matching: MatchingService;
  offers: OfferService;
  appointments: AppointmentService;
  jobs: JobService;
  conversations: ConversationService;
  reviews: ReviewService;

  /** Loest das Bearer-Token auf. Liegt hier, damit der Kontext nicht am AuthService haengt. */
  authenticate(req: IncomingMessage): Promise<Principal | null>;
  /** Schliesst alle Verbindungen. */
  shutdown(): Promise<void>;
}

export interface BuildOptions {
  config: Config;
  db?: Db;
  logger?: Logger;
  aiProvider?: AiProvider;
}

export function createAiProvider(config: Config): AiProvider {
  if (config.ai.provider === "remote") {
    return new RemoteAiProvider({
      baseUrl: config.ai.baseUrl as string,
      apiKey: config.ai.apiKey as string,
      timeoutMs: config.ai.timeoutMs,
    });
  }
  return new RulesAiProvider();
}

export function buildServices(options: BuildOptions): AppServices {
  const { config } = options;
  const db = options.db ?? createPool(config.databaseUrl);
  const logger = options.logger ?? createLogger(config.isProduction ? "info" : "debug");
  const aiProvider = options.aiProvider ?? createAiProvider(config);

  const auth = new AuthService({
    db,
    sessionSecret: config.sessionSecret,
    sessionTtlSeconds: config.sessionTtlSeconds,
  });

  const services: AppServices = {
    config,
    db,
    logger,
    rateLimiter: new RateLimiter(),
    aiProvider,

    auth,
    categories: new CategoryService(db),
    businesses: new BusinessService(db),
    requests: new RequestService(db),
    ai: new AiService(db, aiProvider),
    matching: new MatchingService(db),
    offers: new OfferService(db),
    appointments: new AppointmentService(db),
    jobs: new JobService(db),
    conversations: new ConversationService(db),
    reviews: new ReviewService(db),

    authenticate: (req) => auth.authenticate(req),
    shutdown: async () => {
      // Nur schliessen, wenn der Pool hier entstanden ist - im Test gehoert er
      // dem Aufrufer.
      if (options.db === undefined) await db.end();
    },
  };

  return services;
}
