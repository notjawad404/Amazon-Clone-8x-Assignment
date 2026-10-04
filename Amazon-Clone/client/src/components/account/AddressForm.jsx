import { useState } from 'react'
import { useCreateAddressMutation } from '../../features/addresses/addressesApi'
import { useGetCountriesQuery } from '../../features/locations/locationsApi'
import { useForm } from '../../hooks/useForm'
import { validateAddress } from '../../utils/addressValidation'
import { parseApiError } from '../../utils/apiError'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Checkbox from '../ui/Checkbox'
import Input from '../ui/Input'
import RegionFields from './RegionFields'

const INITIAL_VALUES = {
  fullName: '',
  phone: '',
  country: 'US',
  line1: '',
  line2: '',
  state: '',
  city: '',
  zip: '',
}

export default function AddressForm({ onSaved, onCancel }) {
  const { data: countries = [] } = useGetCountriesQuery()
  const form = useForm(INITIAL_VALUES, (values) =>
    validateAddress(values, {
      hasStates: countries.find((item) => item.code === values.country)?.hasStates ?? true,
    }),
  )
  const [isDefault, setIsDefault] = useState(false)
  const [createAddress, { isLoading }] = useCreateAddressMutation()
  const [serverError, setServerError] = useState(null)
  const isUs = form.values.country === 'US'

  async function handleSubmit(event) {
    event.preventDefault()
    setServerError(null)
    if (!form.validateAll()) return
    const result = await createAddress({ ...form.values, isDefault })
    if (result.error) {
      const { message, fieldErrors } = parseApiError(result.error)
      setServerError(message)
      form.setErrors(fieldErrors)
      return
    }
    onSaved(result.data.address)
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-xl font-bold">Add a new address</h2>
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
      <Checkbox
        label="Make this my default address"
        checked={isDefault}
        onChange={(event) => setIsDefault(event.target.checked)}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Use this address
        </Button>
      </div>
    </form>
  )
}
