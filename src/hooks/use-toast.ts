"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"
import { SoundService } from "@/lib/sound-service"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = Omit<ToastProps, "title" | "description"> & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
    type: ActionType["ADD_TOAST"]
    toast: ToasterToast
  }
  | {
    type: ActionType["UPDATE_TOAST"]
    toast: Partial<ToasterToast>
  }
  | {
    type: ActionType["DISMISS_TOAST"]
    toastId?: ToasterToast["id"]
  }
  | {
    type: ActionType["REMOVE_TOAST"]
    toastId?: ToasterToast["id"]
  }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
              ...t,
              open: false,
            }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id"> & {
  /**
   * صوت الإجراء المركزي (الجولة 8):
   *  - "success" → success_action.mp3   (نجاح إجراء)
   *  - "error"   → error_occurred.mp3   (فشل إجراء)
   *  - "none"    → بلا صوت (توستات الإشعارات — صوتها من نوعها الخاص)
   *  - محذوف     → كشف تلقائي: variant destructive = خطأ، والعناوين
   *                التي تبدأ بـ«تم» أو تحوي «بنجاح» = نجاح
   */
  sound?: "success" | "error" | "none"
}

/** كشف صوت الإجراء تلقائياً من شكل التوست (بلا sound صريح). */
function resolveActionSound(
  props: Toast
): "success_action" | "error_occurred" | null {
  if (props.sound === "none") return null
  if (props.sound === "success") return "success_action"
  if (props.sound === "error") return "error_occurred"
  // توستات الأخطاء في المنصة كلها destructive
  if (props.variant === "destructive") return "error_occurred"
  const title = typeof props.title === "string" ? props.title : ""
  const description = typeof props.description === "string" ? props.description : ""
  if (
    title.startsWith("تم") ||
    description.startsWith("تم") ||
    title.includes("بنجاح") ||
    description.includes("بنجاح")
  ) {
    return "success_action"
  }
  if (
    title.startsWith("خطأ") ||
    title.startsWith("تعذّر") ||
    title.includes("فشل") ||
    description.includes("فشل")
  ) {
    return "error_occurred"
  }
  return null
}

function toast({ ...props }: Toast) {
  const id = genId()

  // صوت الإجراء المركزي (الجولة 8) — يُبث مرة واحدة هنا لكل توست
  const actionSound = resolveActionSound(props)
  if (actionSound) SoundService.play(actionSound)
  // يُنزع حقل sound قبل الإرسال — لا علاقة له بالعرض
  const { sound: _sound, ...toastProps } = props

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...toastProps,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }