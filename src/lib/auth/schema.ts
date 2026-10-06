import { z } from "zod";
import { USER_ROLES } from "./types";

export const MIN_PASSWORD_CHARS = 10;
export const MAX_PASSWORD_CHARS = 200;
export const MAX_USERNAME_CHARS = 40;
export const MAX_DISPLAY_NAME_CHARS = 80;
/** The walk-away PIN: digits only, short enough to type on a phone at the desk. */
export const MIN_PIN_DIGITS = 4;
export const MAX_PIN_DIGITS = 8;

const USERNAME_PATTERN = /^[a-z0-9._-]+$/i;

const usernameSchema = z
  .string()
  .trim()
  .min(1, { error: "Informe o nome de acesso." })
  .max(MAX_USERNAME_CHARS, { error: `Use no máximo ${MAX_USERNAME_CHARS} caracteres.` })
  .regex(USERNAME_PATTERN, { error: "Use apenas letras, números, ponto, hífen ou sublinhado." });

const displayNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Informe o nome." })
  .max(MAX_DISPLAY_NAME_CHARS, { error: `Use no máximo ${MAX_DISPLAY_NAME_CHARS} caracteres.` });

export const newPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_CHARS, { error: `A senha precisa ter ao menos ${MIN_PASSWORD_CHARS} caracteres.` })
  .max(MAX_PASSWORD_CHARS, { error: `Use no máximo ${MAX_PASSWORD_CHARS} caracteres.` });

export const loginSchema = z.object({
  username: z.string().trim().min(1, { error: "Informe o nome de acesso." }).max(MAX_USERNAME_CHARS),
  password: z.string().min(1, { error: "Informe a senha." }).max(MAX_PASSWORD_CHARS),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** The walk-away PIN an admin sets for an account. */
export const pinSchema = z
  .string()
  .regex(new RegExp(`^[0-9]{${MIN_PIN_DIGITS},${MAX_PIN_DIGITS}}$`), {
    error: `O PIN precisa ter de ${MIN_PIN_DIGITS} a ${MAX_PIN_DIGITS} dígitos numéricos.`,
  });

export const newUserSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  password: newPasswordSchema,
  role: z.enum(USER_ROLES, { error: "Selecione um perfil válido." }),
});
export type NewUserInput = z.infer<typeof newUserSchema>;

/** The first admin, created with the one-time code printed in the server log. */
export const setupSchema = newUserSchema.omit({ role: true }).extend({
  setupToken: z.string().trim().min(1, { error: "Informe o código de configuração." }).max(MAX_PASSWORD_CHARS),
});
export type SetupInput = z.infer<typeof setupSchema>;

export const userUpdateSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    role: z.enum(USER_ROLES).optional(),
    disabled: z.boolean().optional(),
    password: newPasswordSchema.optional(),
    /** Sets the walk-away PIN; null removes it. */
    pin: pinSchema.nullable().optional(),
  })
  .refine((update) => Object.values(update).some((value) => value !== undefined), { error: "Nada para atualizar." });
export type UserUpdate = z.infer<typeof userUpdateSchema>;

/** A user changing their own password must confirm the current one. */
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, { error: "Informe a senha atual." }).max(MAX_PASSWORD_CHARS),
  newPassword: newPasswordSchema,
});
export type PasswordChange = z.infer<typeof passwordChangeSchema>;
