import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
let currentProfileId = null;
let isPublished = false;

function setStatus(id, message, isError = false) {
  const node = $(id);
  if (!node) return;
  node.textContent = message;
  node.style.color = isError ? "#a33d4c" : "#47755a";
}
function slugify(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}
function publicUrl(slug) {
  return new URL("profile.html?slug=" + encodeURIComponent(slug), window.location.href).href;
}
function updateAccountUI(user) {
  $("cloudSignOut").hidden = !user;
  $("cloudSignIn").hidden = !!user;
  $("cloudSignUp").hidden = !!user;
  $("cloudEmail").disabled = !!user;
  $("cloudPassword").disabled = !!user;
  setStatus("cloudStatus", user ? "Signed in as " + user.email : "Not signed in.");
}
async function loadOwnProfile(user) {
  const { data, error } = await supabase.from("business_profiles")
    .select("*").eq("owner_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return;
  currentProfileId = data.id;
  isPublished = data.is_published;
  const map = { slug: "slug", name: "business_name", owner: "owner_name", category: "category",
    bio: "bio", phone: "phone", city: "city", website: "website_url",
    instagram: "instagram_url", review: "google_review_url", theme: "theme" };
  Object.entries(map).forEach(([input, column]) => {
    if ($(input) && typeof data[column] === "string") $(input).value = data[column];
  });
  $("publicProfileLink").hidden = !data.is_published;
  $("publicProfileLink").href = publicUrl(data.slug);
  $("publicProfileLink").textContent = "Open public profile";
  if (data.is_published) {
    $("qr").src = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(publicUrl(data.slug));
    $("qrCaption").textContent = publicUrl(data.slug);
  }
  document.dispatchEvent(new Event("input"));
  setStatus("cloudSaveStatus", data.is_published ? "Cloud profile loaded and published." : "Cloud draft loaded.");
}
async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Sign in before saving a cloud profile.");
  return data.user;
}
async function saveCloud(publish) {
  const user = await getUser();
  const businessName = $("name").value.trim();
  const slug = slugify($("slug").value.trim() || businessName);
  if (!businessName || slug.length < 3) throw new Error("Enter a business name and a profile slug of at least 3 characters.");
  $("slug").value = slug;
  const payload = {
    owner_id: user.id, slug, business_name: businessName,
    owner_name: $("owner").value.trim(), category: $("category").value.trim(),
    bio: $("bio").value.trim(), phone: $("phone").value.trim(), city: $("city").value.trim(),
    website_url: $("website").value.trim(), instagram_url: $("instagram").value.trim(),
    google_review_url: $("review").value.trim(), theme: $("theme").value,
    is_published: publish ? true : isPublished
  };
  let query = supabase.from("business_profiles");
  if (currentProfileId) query = query.update(payload).eq("id", currentProfileId);
  else query = query.insert(payload);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  currentProfileId = data.id;
  isPublished = data.is_published;
  if (data.is_published) {
    const url = publicUrl(data.slug);
    $("publicProfileLink").href = url;
    $("publicProfileLink").hidden = false;
    $("qr").src = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(url);
    $("qrCaption").textContent = url;
    setStatus("cloudSaveStatus", "Published. Public profile: " + url);
  } else {
    setStatus("cloudSaveStatus", "Cloud draft saved privately. Publish when ready.");
  }
}
$("cloudSignIn").addEventListener("click", async () => {
  setStatus("cloudStatus", "Signing in…");
  const { error } = await supabase.auth.signInWithPassword({
    email: $("cloudEmail").value.trim(), password: $("cloudPassword").value
  });
  if (error) setStatus("cloudStatus", error.message, true);
});
$("cloudSignUp").addEventListener("click", async () => {
  setStatus("cloudStatus", "Creating account…");
  const { data, error } = await supabase.auth.signUp({
    email: $("cloudEmail").value.trim(), password: $("cloudPassword").value
  });
  if (error) return setStatus("cloudStatus", error.message, true);
  if (!data.session) setStatus("cloudStatus", "Account created. Check your email to confirm, then sign in.");
});
$("cloudSignOut").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) setStatus("cloudStatus", error.message, true);
  else { currentProfileId = null; isPublished = false; setStatus("cloudSaveStatus", "Signed out."); }
});
$("cloudSave").addEventListener("click", async () => {
  setStatus("cloudSaveStatus", "Saving cloud profile…");
  try { await saveCloud(false); } catch (e) { setStatus("cloudSaveStatus", e.message, true); }
});
$("cloudPublish").addEventListener("click", async () => {
  if (!window.confirm("Publish this business profile so anyone with its public link can view it?")) return;
  setStatus("cloudSaveStatus", "Publishing…");
  try { await saveCloud(true); } catch (e) { setStatus("cloudSaveStatus", e.message, true); }
});
supabase.auth.onAuthStateChange((_event, session) => {
  const user = session?.user || null;
  updateAccountUI(user);
  if (user) loadOwnProfile(user).catch(e => setStatus("cloudSaveStatus", e.message, true));
});
supabase.auth.getSession().then(({ data, error }) => {
  if (error) return setStatus("cloudStatus", error.message, true);
  const user = data.session?.user || null;
  updateAccountUI(user);
  if (user) loadOwnProfile(user).catch(e => setStatus("cloudSaveStatus", e.message, true));
});
