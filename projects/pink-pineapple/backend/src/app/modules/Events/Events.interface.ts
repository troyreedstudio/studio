export type IEventFilterRequest = {
  name?: string | undefined;
  email?: string | undefined;
  contactNumber?: string | undefined;
  searchTerm?: string | undefined;
}

export const eventFilterableFields=[
    "eventStatus"
]
export const eventSearchableFields=[
    "eventName"
]