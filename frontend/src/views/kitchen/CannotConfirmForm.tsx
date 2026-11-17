// Inline required reason for "Cannot confirm". A blank reason saves nothing. REQ-11
import { useId, useState } from 'react'
import type { Role } from '../../domain/types'
import { useDispatch } from '../../store/useAppState'

export function CannotConfirmForm(props: { itemId: string; role: Role; onClose: () => void }) {
  const dispatch = useDispatch()
  const [reason, setReason] = useState('')
  const id = useId()
  const save = () => {
    if (reason.trim() === '') return // status stays unchanged; the reducer also rejects it
    dispatch({ type: 'cannotConfirm', itemId: props.itemId, role: props.role, reason })
    props.onClose()
  }
  return (
    <div className="cannot-confirm-form" role="group" aria-label="Cannot confirm reason">
      <label htmlFor={id}>Reason</label>
      <input id={id} type="text" required aria-required="true" value={reason} onChange={(e) => setReason(e.target.value)} />
      <button type="button" className="primary" onClick={save}>
        Save
      </button>
      <button type="button" onClick={props.onClose}>
        Cancel
      </button>
    </div>
  )
}
