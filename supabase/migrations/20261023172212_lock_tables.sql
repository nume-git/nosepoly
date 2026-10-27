-- Todos los datos pasan por el servidor de Next.js (ver docs/ARQUITECTURA.md).
-- RLS activado sin políticas: los clientes con la clave anon o de usuario no
-- pueden leer ni escribir ninguna tabla. El servidor se conecta con DATABASE_URL,
-- que usa un rol que no está sujeto a RLS.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rounds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "predictions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "difficulty_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "validation_votes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
