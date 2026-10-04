import { useState } from 'react'
import { useGetAddressesQuery } from '../../features/addresses/addressesApi'
import AddressForm from '../account/AddressForm'
import Button from '../ui/Button'
import ErrorState from '../ui/ErrorState'
import Modal from '../ui/Modal'
import Skeleton from '../ui/Skeleton'
import AddressSummary from './AddressSummary'

export default function AddressStep({ selectedId, onSelect, isSaving }) {
  const { data: addresses, isError, isFetching, refetch } = useGetAddressesQuery()
  const [choice, setChoice] = useState(selectedId)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const chosenId = choice ?? addresses?.[0]?._id ?? null

  if (isError) {
    return (
      <ErrorState
        title="We couldn’t load your addresses"
        onRetry={refetch}
        isRetrying={isFetching}
      />
    )
  }
  if (!addresses) return <Skeleton className="h-24 w-full" />

  return (
    <div className="space-y-3">
      {addresses.length > 0 && (
        <fieldset className="space-y-2 rounded-md border border-gray-300 p-3">
          <legend className="px-1 text-sm font-bold">Your addresses</legend>
          {addresses.map((address) => (
            <label
              key={address._id}
              className={`flex cursor-pointer gap-3 rounded-md p-2 text-sm ${chosenId === address._id ? 'bg-btn-yellow/15 ring-1 ring-btn-orange' : ''}`}
            >
              <input
                type="radio"
                name="address"
                value={address._id}
                checked={chosenId === address._id}
                onChange={() => setChoice(address._id)}
                className="mt-1 accent-link"
              />
              <AddressSummary address={address} />
            </label>
          ))}
        </fieldset>
      )}
      <button
        type="button"
        onClick={() => setIsFormOpen(true)}
        className="cursor-pointer rounded-sm text-sm text-link hover:text-link-hover hover:underline focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
      >
        + Add a new address
      </button>
      {addresses.length > 0 && (
        <div>
          <Button onClick={() => onSelect(chosenId)} isLoading={isSaving} disabled={!chosenId}>
            Use this address
          </Button>
        </div>
      )}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} label="Add a new address">
        <AddressForm
          onCancel={() => setIsFormOpen(false)}
          onSaved={(address) => {
            setIsFormOpen(false)
            onSelect(address._id)
          }}
        />
      </Modal>
    </div>
  )
}
