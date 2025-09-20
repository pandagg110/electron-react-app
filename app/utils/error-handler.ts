export interface ErrorInfo {
  code?: string
  message: string
  details?: any
  timestamp: number
}

export class BattleError extends Error {
  public readonly code?: string
  public readonly details?: any
  public readonly timestamp: number

  constructor(message: string, code?: string, details?: any) {
    super(message)
    this.name = 'BattleError'
    this.code = code
    this.details = details
    this.timestamp = Date.now()
  }

  toErrorInfo(): ErrorInfo {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    }
  }
}

export const handleSupabaseError = (error: any): BattleError => {
  if (error?.code) {
    switch (error.code) {
      case 'PGRST116':
        return new BattleError('数据库连接超时，请检查网络连接', 'CONNECTION_TIMEOUT', error)
      case 'PGRST301':
        return new BattleError('数据库查询语法错误', 'QUERY_ERROR', error)
      case '23505':
        return new BattleError('数据已存在，无法重复创建', 'DUPLICATE_KEY', error)
      case '23503':
        return new BattleError('关联数据不存在', 'FOREIGN_KEY_VIOLATION', error)
      case 'row_not_found':
        return new BattleError('请求的数据不存在', 'NOT_FOUND', error)
      default:
        return new BattleError(`数据库错误: ${error.message}`, error.code, error)
    }
  }

  if (error?.message) {
    if (error.message.includes('fetch')) {
      return new BattleError('网络连接失败，请检查网络状态', 'NETWORK_ERROR', error)
    }
    if (error.message.includes('timeout')) {
      return new BattleError('请求超时，请重试', 'TIMEOUT', error)
    }
    if (error.message.includes('Failed to connect to Realtime')) {
      return new BattleError('实时连接失败，正在尝试重连...', 'REALTIME_CONNECTION_FAILED', error)
    }
  }

  return new BattleError(error?.message || '未知错误', 'UNKNOWN', error)
}

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === maxRetries) {
        throw lastError
      }

      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

export const isRetryableError = (error: any): boolean => {
  if (error instanceof BattleError) {
    return ['CONNECTION_TIMEOUT', 'NETWORK_ERROR', 'TIMEOUT', 'REALTIME_CONNECTION_FAILED'].includes(error.code || '')
  }

  if (error?.code) {
    // Postgres connection errors that are retryable
    return ['PGRST116', '08000', '08003', '08006'].includes(error.code)
  }

  if (error?.message) {
    const message = error.message.toLowerCase()
    return message.includes('network') ||
           message.includes('timeout') ||
           message.includes('connection') ||
           message.includes('fetch')
  }

  return false
}