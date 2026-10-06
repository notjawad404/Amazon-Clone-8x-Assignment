import { useState } from 'react'
import AddressCard from '../components/account/AddressCard'
import AddressForm from '../components/account/AddressForm'
import Breadcrumbs from '../components/ui/Breadcrumbs'
import ErrorState from '../components/ui/ErrorState'
import Icon from '../components/ui/Icon'
import Modal from '../components/ui/Modal'
import Skeleton from '../components/ui/Skeleton'
import { useGetAddressesQuery } from '../features/addresses/addressesApi'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { MAX_ADDRESSES } from '../utils/constants'

const CRUMBS = [{ label: 'Your Account', to: '/account' }, { label: 'Your Addresses' }]

function AddTile({ onClick }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex h-full min-h-64 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-400 bg-white text-xl font-bold text-gray-700 hover:bg-gray-50 focus-visible:ring-3 focus-visible:ring-focus/40 focus-visible:outline-none"
      >
        <Icon name="plus" className="size-10 text-gray-400" />
        Add address
      </button>
    </li>
  )
}

export default function AddressesPage() {
  useDocumentTitle('Your Addresses')
  const { data: addresses, isError, isFetching, refetch } = useGetAddressesQuery()
  // null: closed, 'new': adding, otherwise the address being edited.
  const [editing, setEditing] = useState(null)
  const isNew = editing === 'new'
  const close = () => setEditing(null)

  let content
  if (isError) {
    content = (
      <ErrorState
        title="We couldn’t load your addresses"
        onRetry={refetch}
        isRetrying={isFetching}
      />
    )
  } else if (!addresses) {
    content = <Skeleton className="h-64 w-full" />
  } else {
    content = (
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {addresses.length < MAX_ADDRESSES && <AddTile onClick={() => setEditing('new')} />}
        {addresses.map((address) => (
          <AddressCard key={address._id} address={address} onEdit={setEditing} />
        ))}
      </ul>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Breadcrumbs items={CRUMBS} className="mb-3" />
      <h1 className="mb-5 text-3xl">Your Addresses</h1>
      {content}
      <Modal
        isOpen={Boolean(editing)}
        onClose={close}
        label={isNew ? 'Add a new address' : 'Edit your address'}
      >
        {editing && (
          <AddressForm
            key={isNew ? 'new' : editing._id}
            address={isNew ? null : editing}
            submitLabel={isNew ? 'Add address' : 'Save changes'}
            onSaved={close}
            onCancel={close}
          />
        )}
      </Modal>
    </div>
  )
}
