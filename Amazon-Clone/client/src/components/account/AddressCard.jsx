import { useState } from 'react'
import {
  useDeleteAddressMutation,
  useSetDefaultAddressMutation,
} from '../../features/addresses/addressesApi'
import { parseApiError } from '../../utils/apiError'
import AddressSummary from '../checkout/AddressSummary'
import ConfirmDialog from '../ui/ConfirmDialog'

const ACTION =
  'cursor-pointer rounded-sm text-sm text-link hover:text-link-hover hover:underline focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none disabled:opacity-60'

function Divider() {
  return <span aria-hidden="true" className="h-4 border-l border-gray-300" />
}

export default function AddressCard({ address, onEdit }) {
  const [isConfirming, setIsConfirming] = useState(false)
  const [deleteAddress, deleting] = useDeleteAddressMutation()
  const [setDefaultAddress, settingDefault] = useSetDefaultAddressMutation()
  const [error, setError] = useState(null)

  async function remove() {
    const result = await deleteAddress(address._id)
    if (result.error) setError(parseApiError(result.error).message)
    else setIsConfirming(false)
  }

  async function makeDefault() {
    setError(null)
    const result = await setDefaultAddress(address._id)
    if (result.error) setError(parseApiError(result.error).message)
  }

  return (
    <li className="flex min-h-64 flex-col rounded-lg border border-gray-300 bg-white">
      {address.isDefault && (
        <p className="border-b border-gray-300 px-4 py-2 text-xs text-gray-700">Default address</p>
      )}
      <div className="flex-1 space-y-1 p-4 text-sm">
        <AddressSummary address={address} />
        <p>Phone number: {address.phone}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4">
        <button type="button" onClick={() => onEdit(address)} className={ACTION}>
          Edit
        </button>
        <Divider />
        <button type="button" onClick={() => setIsConfirming(true)} className={ACTION}>
          Remove
        </button>
        {!address.isDefault && (
          <>
            <Divider />
            <button
              type="button"
              onClick={makeDefault}
              disabled={settingDefault.isLoading}
              className={ACTION}
            >
              Set as Default
            </button>
          </>
        )}
      </div>
      {!isConfirming && error && (
        <p role="alert" className="px-4 pb-3 text-xs text-error">
          {error}
        </p>
      )}
      <ConfirmDialog
        isOpen={isConfirming}
        title="Remove this address?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        isConfirming={deleting.isLoading}
        error={error}
        onConfirm={remove}
        onClose={() => setIsConfirming(false)}
      >
        <AddressSummary address={address} />
      </ConfirmDialog>
    </li>
  )
}
