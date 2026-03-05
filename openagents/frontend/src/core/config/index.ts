import { env } from "@/env";

export function getBackendBaseURL() {
  if (env.NEXT_PUBLIC_BACKEND_BASE_URL) {
    return env.NEXT_PUBLIC_BACKEND_BASE_URL;
  } else {
    return "";
  }
}

export function getGatewayBaseURL() {
  if (env.NEXT_PUBLIC_GATEWAY_BASE_URL) {
    return env.NEXT_PUBLIC_GATEWAY_BASE_URL;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:8080";
}

// Keep backward compat alias
export function getLangGraphBaseURL(isMock?: boolean) {
  return getGatewayBaseURL();
}
