import { useState, useCallback, useRef } from 'react'
import { Modal, Button } from 'react-bootstrap'

const INITIAL = {
  show: false,
  title: 'Confirmar',
  message: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  variant: 'primary',
}

/**
 * Diálogo de confirmación acorde al diseño Spectra (reemplaza window.confirm).
 * @returns {{ confirm: (options: string | object) => Promise<boolean>, ConfirmDialog: () => JSX.Element }}
 */
export function useConfirm() {
  const resolveRef = useRef(null)
  const [state, setState] = useState(INITIAL)

  const finish = useCallback((result) => {
    resolveRef.current?.(result)
    resolveRef.current = null
    setState((s) => ({ ...s, show: false }))
  }, [])

  const confirm = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : (options || {})
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState({
        show: true,
        title: opts.title ?? 'Confirmar',
        message: opts.message ?? '',
        confirmLabel: opts.confirmLabel ?? 'Confirmar',
        cancelLabel: opts.cancelLabel ?? 'Cancelar',
        variant: opts.variant ?? 'primary',
      })
    })
  }, [])

  const ConfirmDialog = useCallback(
    function SpectraConfirmDialog() {
      const btnVariant =
        state.variant === 'danger' ? 'danger' : state.variant === 'warning' ? 'warning' : 'primary'

      return (
        <Modal
          show={state.show}
          onHide={() => finish(false)}
          centered
          className="spectra-confirm-modal"
          backdrop="static"
          animation
        >
          <Modal.Header closeButton className="spectra-confirm-modal__header">
            <Modal.Title as="h5">{state.title}</Modal.Title>
          </Modal.Header>
          {state.message ? (
            <Modal.Body className="spectra-confirm-modal__body">{state.message}</Modal.Body>
          ) : null}
          <Modal.Footer className="spectra-confirm-modal__footer">
            <Button variant="outline-secondary" size="sm" onClick={() => finish(false)}>
              {state.cancelLabel}
            </Button>
            <Button variant={btnVariant} size="sm" onClick={() => finish(true)}>
              {state.confirmLabel}
            </Button>
          </Modal.Footer>
        </Modal>
      )
    },
    [state, finish],
  )

  return { confirm, ConfirmDialog }
}
