import QRCode from "qrcode";
import { headers } from "next/headers";

/*
 * QR-Codes für Liga-Einladungen.
 *
 * Im Code steht ausschließlich die Beitrittsadresse mit dem Code - keine
 * Namen, keine Kennungen, nichts über die Person, die einlädt.
 */

export async function basisAdresse(): Promise<string> {
  const kopf = await headers();
  const host = kopf.get("x-forwarded-host") ?? kopf.get("host") ?? "localhost:3000";
  const protokoll = kopf.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protokoll}://${host}`;
}

export async function einladungsAdresse(code: string): Promise<string> {
  return `${await basisAdresse()}/ligen/beitreten/${code}`;
}

export async function qrAlsSvg(inhalt: string): Promise<string> {
  return QRCode.toString(inhalt, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#101A2B", light: "#FFFFFF" },
  });
}
