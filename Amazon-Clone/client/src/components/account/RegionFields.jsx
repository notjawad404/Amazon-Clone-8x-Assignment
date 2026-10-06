import { useEffect, useEffectEvent, useId } from 'react'
import {
  useGetCitiesQuery,
  useGetCountriesQuery,
  useGetStatesQuery,
} from '../../features/locations/locationsApi'
import Input from '../ui/Input'
import Select from '../ui/Select'

// Country → state/province → city. A country without states gets a free-text region, and the
// city list is offered as suggestions so a town missing from the data can still be typed.
export default function RegionFields({ form }) {
  const citiesListId = useId()
  const { country, state } = form.values
  const { data: countries = [], isLoading: isLoadingCountries } = useGetCountriesQuery()
  const hasStates = countries.find((item) => item.code === country)?.hasStates ?? true
  const { currentData: states = [], isFetching: isLoadingStates } = useGetStatesQuery(country, {
    skip: !country || !hasStates,
  })
  const { currentData: cities = [] } = useGetCitiesQuery(
    { country, state },
    { skip: !state || !hasStates },
  )
  const countryField = form.fieldProps('country')
  const stateField = form.fieldProps('state')

  // Addresses saved before full names were required can hold a code like "WA".
  const legacyState = states.find((item) => item.code === state && item.name !== state)
  const applyStateName = useEffectEvent((name) => form.setFieldValues({ state: name }))
  useEffect(() => {
    if (legacyState) applyStateName(legacyState.name)
  }, [legacyState])

  return (
    <>
      <Select
        label="Country/Region"
        autoComplete="country"
        disabled={isLoadingCountries}
        {...countryField}
        onChange={(event) =>
          form.setFieldValues({ country: event.target.value, state: '', city: '' })
        }
      >
        {isLoadingCountries && <option value={country}>Loading countries…</option>}
        {countries.map((item) => (
          <option key={item.code} value={item.code}>
            {item.name}
          </option>
        ))}
      </Select>
      <div className="grid gap-3 sm:grid-cols-2">
        {hasStates ? (
          <Select
            label="State / Province / Region"
            autoComplete="address-level1"
            disabled={isLoadingStates}
            {...stateField}
            onChange={(event) => form.setFieldValues({ state: event.target.value, city: '' })}
          >
            <option value="">{isLoadingStates ? 'Loading…' : 'Select'}</option>
            {states.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            label="State / Province / Region (optional)"
            autoComplete="address-level1"
            {...stateField}
          />
        )}
        <div>
          <Input
            label="City"
            autoComplete="address-level2"
            list={cities.length ? citiesListId : undefined}
            placeholder={cities.length ? 'Start typing to search' : undefined}
            hint={hasStates && !state ? 'Choose a state first to see its cities.' : undefined}
            {...form.fieldProps('city')}
          />
          {cities.length > 0 && (
            <datalist id={citiesListId}>
              {cities.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          )}
        </div>
      </div>
    </>
  )
}
