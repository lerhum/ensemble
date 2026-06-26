import type { Db } from "@ensemble/db/node";
import type { SessionUserDTO } from "@ensemble/db/shared";
import type { Storage } from "./storage.js";
import type { EmailService } from "./email.js";

// Variables injectées dans le contexte Hono par le middleware de config.
export interface AppEnv {
  Variables: {
    db: Db;
    storage: Storage;
    email: EmailService;
    sessionSecret: string;
    webOrigin: string;
    user: SessionUserDTO | null;
  };
}

// Configuration résolue par chaque entrée (Node ou Worker) puis injectée.
export interface AppConfig {
  db: Db;
  storage: Storage;
  email: EmailService;
  sessionSecret: string;
  webOrigin: string;
}
