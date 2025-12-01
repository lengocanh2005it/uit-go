export const GRPC_METHODS = {
  USER_SERVICE: {
    GET_ME: 'getMe',
    UPDATE_PROFILE: 'updateProfile',
    LOGIN: 'login',
    REGISTER: 'register',
    SIGN_OUT: 'signOut',
  },
  TRIP_SERVICE: {
    GET_TRIP: 'getTrip',
    CREATE_TRIP: 'createTrip',
    UPDATE_TRIP: 'updateTrip',
    CANCEL_TRIP: 'cancelTrip',
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
    FIND_AVAILABLE_DRIVERS: 'findAvailableDrivers',
    UPDATE_DRIVER_LOCATION: 'updateDriverLocation',
  },
  NOTIFICATION_SERVICE: {
    GET_NOTIFICATIONS_OF_USER: 'getNotificationsOfUser',
    DELETE_NOTIFICATION_OF_USER: 'deleteNotificationOfUser',
    MARK_AS_READ: 'markAsRead',
  },
};
