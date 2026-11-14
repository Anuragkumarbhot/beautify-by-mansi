import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
let activeProfile = null;
let plans = [];

function status(message, error = false) {
  const el = $("billingStatus");
  if (!el) return;
  el.textContent = message;
  el.style.color = error ? "#a33d4c" : "#47755a";
}
function money(paise, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 })
    .format(Number(paise) / 100);
}
function addText(parent, tag, className, value) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = value;
  parent.append(el);
  return el;
}
async function loadProfile() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) {
    activeProfile = null;
    return null;
  }
  const { data, error } = await supabase.from("business_profiles")
    .select("id,business_name,slug").eq("owner_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const selector = $("profileSelector");
  const selectedId = selector?.value;
  activeProfile = (data || []).find(item => item.id === selectedId) || data?.[0] || null;
  return { user, profile: activeProfile };
}
async function loadPlans() {
  const { data, error } = await supabase.from("subscription_plans")
    .select("code,name,amount_paise,currency,duration_days")
    .eq("active", true).order("amount_paise", { ascending: true });
  if (error) throw error;
  plans = data || [];
  renderPlans();
}
function renderPlans() {
  const root = $("billingPlans");
  root.replaceChildren();
  if (!plans.length) {
    addText(root, "p", "hint", "No active plans are available yet.");
    return;
  }
  plans.forEach((plan) => {
    const card = document.createElement("article");
    card.className = "plan";
    addText(card, "h3", "", plan.name);
    addText(card, "strong", "", money(plan.amount_paise, plan.currency));
    addText(card, "p", "", plan.duration_days + " days of access");
    const button = addText(card, "button", "btn", "Continue to secure checkout");
    button.type = "button";
    button.addEventListener("click", () => startCheckout(plan).catch((e) => status(e.message || "Could not start checkout.", true)));
    card.append();
    root.append(card);
  });
}
async function loadHistory() {
  const root = $("subscriptionHistory");
  root.replaceChildren();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) {
    addText(root, "p", "", "Sign in to view your payment history.");
    return;
  }
  const { data, error } = await supabase.from("customer_subscriptions")
    .select("plan_code,amount_paise,currency,status,created_at,ends_at")
    .eq("owner_id", user.id).order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  addText(root, "h3", "", "Payment history");
  if (!data?.length) {
    addText(root, "p", "", "No payment orders yet.");
    return;
  }
  data.forEach((item) => {
    const row = document.createElement("p");
    row.style.cssText = "padding:10px 0;border-bottom:1px solid #eadfd8;margin:0";
    const date = new Date(item.created_at).toLocaleString("en-IN");
    const expiry = item.ends_at ? " · Access until " + new Date(item.ends_at).toLocaleDateString("en-IN") : "";
    row.textContent = item.plan_code + " · " + money(item.amount_paise, item.currency) +
      " · " + item.status.toUpperCase() + " · " + date + expiry;
    root.append(row);
  });
}
async function loadRazorpay() {
  if (window.Razorpay) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Razorpay Checkout could not load. Check your connection and retry."));
    document.head.append(script);
  });
}
async function startCheckout(plan) {
  const account = await loadProfile();
  if (!account?.user) throw new Error("Sign in to your Business Studio account first.");
  if (!account.profile) throw new Error("Save your business profile to the cloud before purchasing a plan.");
  status("Creating a secure payment order…");
  const { data: order, error } = await supabase.functions.invoke("create-order", {
    body: { profile_id: account.profile.id, plan_code: plan.code }
  });
  if (error) throw new Error(error.message || "Order creation failed. Confirm the create-order function is deployed.");
  if (!order?.order_id || !order?.key_id || !Number.isFinite(Number(order.amount))) {
    throw new Error("The payment service returned an incomplete order.");
  }
  await loadRazorpay();
  const checkout = new window.Razorpay({
    key: order.key_id,
    amount: order.amount,
    currency: order.currency || "INR",
    name: "Beautify by Mansi",
    description: order.plan_name || plan.name,
    order_id: order.order_id,
    prefill: { email: account.user.email || "" },
    theme: { color: "#51283b" },
    modal: { ondismiss: () => status("Checkout closed. If you completed payment, refresh status after the payment provider sends its verification webhook.") },
    handler: () => {
      status("Checkout response received. Payment is awaiting server-side verification; refresh status shortly. Do not retry unless the order is marked failed.");
      loadHistory().catch(() => {});
    }
  });
  checkout.on("payment.failed", (response) => {
    status(response.error?.description || "Payment failed. Check payment history before trying again.", true);
    loadHistory().catch(() => {});
  });
  status("Secure checkout is ready.");
  checkout.open();
}
async function refresh() {
  try {
    const account = await loadProfile();
    if (!account?.user) status("Sign in to purchase a plan and view payment history.");
    else if (!account.profile) status("Cloud account found. Save your business profile first to enable checkout.");
    else status("Signed in for " + account.profile.business_name + ". Choose a plan to continue.");
    await loadHistory();
  } catch (e) {
    status(e.message || "Could not refresh billing information.", true);
  }
}
window.addEventListener("bm:active-profile-changed", (event) => {
  activeProfile = event.detail?.profile || null;
  refresh();
});
$("profileSelector")?.addEventListener("change", refresh);
$("refreshBilling")?.addEventListener("click", refresh);
supabase.auth.onAuthStateChange(() => {
  refresh();
});
loadPlans().catch((e) => status(e.message || "Could not load plans. Apply billing migration 003 first.", true));
refresh();
