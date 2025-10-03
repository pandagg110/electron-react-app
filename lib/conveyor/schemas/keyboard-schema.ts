import { z } from 'zod'

const normalizeKeySchema = z
  .string()
  .min(1)
  .transform((value) => value.trim())
  .transform((value) => (value.length === 1 ? value.toUpperCase() : value))

export const keyboardIpcSchema = {
  'keyboard-register-binding': {
    args: z.tuple([z.union([normalizeKeySchema, z.null()])]),
    return: z.object({
      success: z.boolean(),
      key: z.string().nullable(),
    }),
  },
  'keyboard-unregister-all': {
    args: z.tuple([]),
    return: z.boolean(),
  },
} as const

