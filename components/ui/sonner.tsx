import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"
import * as React from "react"

const Sonner = () => {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ ...props }) {
        return (
          <Toast key={props.id} {...props}>
            <div className="grid gap-1">
              {props.title && <ToastTitle>{props.title}</ToastTitle>}
              {props.description && (
                <ToastDescription>{props.description}</ToastDescription>
              )}
            </div>
            <ToastClose className="shrink-0" />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

export default Sonner
