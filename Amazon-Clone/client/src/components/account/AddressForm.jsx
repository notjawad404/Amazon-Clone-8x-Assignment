import { useState } from 'react'
import {
  useCreateAddressMutation,
  useUpdateAddressMutation,
} from '../../features/addresses/addressesApi'
import { useGetCountriesQuery } from '../../features/locations/locationsApi'
import { useForm } from '../../hooks/useForm'
import { validateAddress } from '../../utils/addressValidation'
import { parseApiError } from '../../utils/apiError'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Checkbox from '../ui/Checkbox'
import Input from '../ui/Input'
import RegionFields from './RegionFields'

const FIELDS = ['fullName', 'phone', 'country', 'line1', 'line2', 'state', 'city', 'zip']

function initialValues(address) {
  return Object.fromEntries(
    FIELDS.map((field) => [field, address?.[field] ?? (field === 'country' ? 'US' : '')]),
  )
}

/** Adds a new address, or edits `address` when one is passed. */
export default function AddressForm({ address = null, submitLabel, onSaved, onCancel }) {
  const isEditing = Boolean(address)
  const { data: countries = [] } = useGetCountriesQuery()
  const form = useForm(initialValues(address), (values) =>
    validateAddress(values, {
      hasStates: countries.find((item) => item.code === values.country)?.hasStates ?? true,
    }),
  )
  const [isDefault, setIsDefault] = useState(false)
  const [createAddress, createState] = useCreateAddressMutation()
  const [updateAddress, updateState] = useUpdateAddressMutation()
  const [serverError, setServerError] = useState(null)
  const isUs = form.values.country === 'US'

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError(null)
    if (!form.validateAll()) return
    const result = isEditing
      ? await updateAddress({ addressId: address._id, ...form.values })
      : await createAddress({ ...form.values, isDefault })
    if (result.error) {
      const { message, fieldErrors } = parseApiError(result.error)
      setServerError(message)
      form.setErrors(fieldErrors)
      return
    }
    onSaved(isEditing ? address : result.data.address)
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-xl font-bold">{isEditing ? 'Edit your address' : 'Add a new address'}</h2>
      {serverError && <Alert title="There was a problem">{serverError}</Alert>}
      <Input
        label="Full name (first and last name)"
        autoComplete="name"
        {...form.fieldProps('fullName')}
      />
      <Input label="Phone number" type="tel" autoComplete="tel" {...form.fieldProps('phone')} />
      <RegionFields form={form} />
      <Input
        label="Address"
        autoComplete="address-line1"
        placeholder="Street address or P.O. Box"
        {...form.fieldProps('line1')}
      />
      <Input
        label="Apt, suite, unit (optional)"
        autoComplete="address-line2"
        {...form.fieldProps('line2')}
      />
      <Input
        label={isUs ? 'ZIP code' : 'Postal code (optional)'}
        autoComplete="postal-code"
        className="sm:w-1/2"
        {...form.fieldProps('zip')}
      />
      {!isEditing && (
        <Checkbox
          label="Make this my default address"
          checked={isDefault}
          onChange={(event) => setIsDefault(event.target.checked)}
        />
      )}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={createState.isLoading || updateState.isLoading}>
          {submitLabel ?? (isEditing ? 'Save changes' : 'Use this address')}
        </Button>
      </div>
    </form>
  )
}
