export type AppRole = string;

export type MobileAuthUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  companyId: string;
  driverId: string | null;
};

export type MobileLoginResponse = {
  ok: true;
  data: {
    token: string;
    refreshToken: string;
    user: MobileAuthUser;
  };
};

export type MobileRefreshResponse = {
  ok: true;
  data: {
    token: string;
  };
};

export type AuthSession = {
  token: string;
  refreshToken: string;
  user: MobileAuthUser;
};

export type Tour = {
  id: string;
  status: "PLANNED" | "CONFIRMED" | "IN_TRANSIT" | "COMPLETED" | string;
  routeLabel: string;
  dateLabel: string;
};

export type TourStop = {
  sequence: number | null;
  type: string | null;
  locationName: string | null;
  companyName: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  plannedArrivalAt: string | null;
  plannedDepartureAt: string | null;
  contactName: string | null;
  contactPhone: string | null;
  freightForwarder: string | null;
  customsOffice: string | null;
  driverNote: string | null;
  status: string | null;
};

export type TourForwarderInfo = {
  name: string | null;
  customsPlace: string | null;
  address: string | null;
  contact: string | null;
  note: string | null;
};

export type TourNotes = {
  internalNote: string | null;
  driverNote: string | null;
  loadingNote: string | null;
  unloadingNote: string | null;
  customsNote: string | null;
};

export type TourDetails = Tour & {
  vehicleId: string | null;
  vehicleLabel: string | null;
  trailerLabel: string | null;
  freightOrderCode: string | null;
  startLocation: string | null;
  endLocation: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  stops: TourStop[];
  forwarder: TourForwarderInfo | null;
  documents: AppDocument[];
  detailedNotes: TourNotes;
};

export type AppNotification = {
  id: string;
  type?: string;
  title: string;
  message: string;
  isRead: boolean;
  severity: "info" | "warning" | "critical";
  actionUrl?: string | null;
  metadata?: {
    tourId?: string;
    threadId?: string;
    notificationId?: string;
  } | null;
  createdAt: string;
};

export type DriverProfile = {
  id: string;
  name: string;
  phone: string | null;
  licenseExpiry: string | null;
};

export type MobileDriverProfile = {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    companyId: string;
  };
  company: {
    id: string;
    name: string;
  };
  driver: {
    id: string;
    name: string;
    jmbg: string | null;
    address: string | null;
    phone: string | null;
    licenseNumber: string | null;
    licenseCategory: string | null;
    licenseValidTo: string | null;
    medicalExamDate: string | null;
    medicalExamValidTo: string | null;
    driverCardId: string | null;
    driverCardValid: string | null;
    adrCertificate: boolean;
    adrValidTo: string | null;
    cpcCertificate: boolean;
    cpcValidTo: string | null;
    notes: string | null;
  };
};

export type ExpenseSheetStatus = "OPEN" | "SUBMITTED" | "APPROVED" | "CLOSED";

export type ExpenseItem = {
  id: string;
  sheetId: string;
  country: string;
  sequence: number;
  category: string;
  note: string | null;
  cardAmount: number | null;
  cashAmount: number | null;
  currency: string;
  receiptUrl: string | null;
  date: string | null;
};

export type ExpenseSheet = {
  id: string;
  tourId: string;
  driverId: string;
  advance: number | null;
  advanceCurrency: string;
  status: ExpenseSheetStatus;
  notes: string | null;
  items: ExpenseItem[];
};

export type AppDocument = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number | null;
  relatedType: string;
  relatedId: string;
  tourId: string | null;
  createdAt: string;
};

export type ChatParticipant = {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  lastReadAt: string | null;
};

export type ChatThread = {
  id: string;
  title: string | null;
  isGroup: boolean;
  updatedAt: string;
  participants: ChatParticipant[];
  lastMessage: {
    id: string;
    body: string;
    senderId: string;
    senderName: string;
    createdAt: string;
  } | null;
  hasUnread: boolean;
};

export type ChatUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  } | null;
};
