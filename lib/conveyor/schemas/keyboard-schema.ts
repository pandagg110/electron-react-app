import { z } from 'zod'

export const keyboardIpcSchema = {
  'keyboard-register-binding': {
    args: z.tuple([z.string().nullable()]),
    return: z.object({
      success: z.boolean(),
      key: z.string().nullable(),
      error: z.string().optional(),
    }),
  },
  'keyboard-unregister-all': {
    args: z.tuple([]),
    return: z.object({
      success: z.boolean(),
    }),
  },
} as const
