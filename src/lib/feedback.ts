export type FeedbackTone = 'success' | 'error'

export interface FeedbackNotice {
  tone: FeedbackTone
  title: string
  message: string
}

export interface ConfirmationRequest {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
}

type NoticeListener = (notice: FeedbackNotice) => void
type ConfirmationHandler = (request: ConfirmationRequest) => Promise<boolean>

const noticeListeners = new Set<NoticeListener>()
let confirmationHandler: ConfirmationHandler | undefined

export function notify(notice: FeedbackNotice): void {
  noticeListeners.forEach(listener => listener(notice))
}

export function subscribeToNotices(listener: NoticeListener): () => void {
  noticeListeners.add(listener)
  return () => noticeListeners.delete(listener)
}

export function registerConfirmationHandler(handler: ConfirmationHandler): () => void {
  confirmationHandler = handler
  return () => {
    if (confirmationHandler === handler) confirmationHandler = undefined
  }
}

export function requestConfirmation(request: ConfirmationRequest): Promise<boolean> {
  return confirmationHandler?.(request) ?? Promise.resolve(false)
}
