export const GRPC_METHODS = {
  TRIP_SERVICE: {
    GET_TRIP: 'getTrip',
    CREATE_TRIP: 'createTrip',
    UPDATE_TRIP: 'updateTrip',
    DELETE_TRIP: 'deleteTrip',
    UPDATE_TRIP_REQUEST_STATUS: 'updateTripRequestStatus',
    GET_ESTIMATE: 'getEstimate',
    RATE_TRIP: 'rateTrip',
  },
  DRIVER_SERVICE: {
    UPDATE_DRIVER_STATUS_GRPC: 'updateDriverStatusGrpc',
    GET_ALL_TRIPS_OF_DRIVER: 'getAllTripsOfDriver',
    UPDATE_DRIVER_APPROVAL: 'updateDriverApproval',
    GET_LOCATION_OF_DRIVER: 'getLocationOfDriver',
    GET_DRIVER_APPROVALS: 'getDriverApprovals',
    GET_DRIVER_INFO_DETAIL_BY_ID: 'getDriverInfoDetailById',
  },
};
