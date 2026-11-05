export type OrderStatus =
  | "demande"
  | "devis_envoye"
  | "en_cours"
  | "revision"
  | "livre";
export type PaymentStatus = "non_paye" | "acompte" | "paye";
export type OrderPriority = "basse" | "normale" | "haute" | "urgente";
export type InboxSource = "discord" | "twitter" | "formulaire" | "manuel";
export type InboxStatus = "nouvelle" | "lue" | "traitee" | "ignoree";

export type Client = {
  id: string;
  name: string;
  email: string | null;
  discord: string | null;
  other_contact: string | null;
  notes: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  client_id: string | null;
  title: string;
  service_type: string;
  description: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  priority: OrderPriority;
  total_price: number;
  deposit: number;
  deadline: string | null;
  revisions_included: number;
  revisions_used: number;
  time_spent_minutes: number;
  tags: string[];
  paid_at: string | null;
  deposit_at: string | null;
  board_note?: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderWithClient = Order & { client: Client | null };

export type OrderFile = {
  id: string;
  order_id: string;
  name: string;
  type: string | null;
  size: number;
  storage_path: string;
  created_at: string;
};

export type OrderBoard = {
  order_id: string;
  content: unknown;
  version: number;
  updated_at: string;
};

export type Checklist = {
  id: string;
  order_id: string;
  title: string;
  position: number;
  created_at: string;
};
export type ChecklistItem = {
  id: string;
  checklist_id: string;
  text: string;
  done: boolean;
  position: number;
  created_at: string;
};
export type ChecklistWithItems = Checklist & { items: ChecklistItem[] };

export type InboxItem = {
  id: string;
  source: InboxSource;
  external_id: string;
  author_name: string;
  author_id: string | null;
  author_avatar: string | null;
  message: string;
  conversation_url: string | null;
  received_at: string;
  status: InboxStatus;
  order_id: string | null;
  created_at: string;
};

export type Settings = {
  monthly_goal: number;
  messenger_links: { discord: string; twitter: string; instagram: string; email: string };
  reminder_days: number[];
  reminder_overdue: boolean;
  reminder_quote_days: number;
  notification_email: string;
  email_api_key: string;
  email_from: string;
  read_notifications: Record<string, string>;
  x_sync_enabled: boolean;
  x_sync_interval_minutes: number;
  x_monthly_call_limit: number;
  x_call_cost_estimate: number;
};
