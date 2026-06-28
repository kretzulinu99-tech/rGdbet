# rGdbet Premium — Implementare Google Play Billing v7.0.0

## Structura fișierelor

```
app/src/main/java/com/rgdbet/app/
├── billing/
│   ├── BillingModels.kt        — PremiumState, SubscriptionPlanUi, ID-uri produse
│   ├── PremiumStatusCache.kt   — cache local (SharedPreferences) pt. mod offline
│   └── BillingManager.kt       — clasa centrală (conectare, verificare, ack, query prețuri)
├── data/
│   └── TicketLimitCheck.kt     — funcția de verificare a limitei de 20 bilete
└── ui/
    ├── AddTicketActivity.kt        — exemplu integrare verificare înainte de salvare
    └── PremiumPaywallActivity.kt   — ecranul de upgrade cu prețuri live

app/src/main/res/layout/
├── activity_premium_paywall.xml
└── snippet_premium_button_replaces_revolut.xml
```

## Pași OBLIGATORII în Google Play Console (înainte ca acest cod să funcționeze)

1. **Creează aplicația în Play Console** și încarcă cel puțin un build
   intern (Internal Testing track) — Billing API nu funcționează deloc
   pentru aplicații care nu au fost niciodată încărcate.

2. **Monetizare → Produse → Abonamente** → creează un abonament nou cu
   ID-ul exact `rgdbet_premium` (trebuie să corespundă cu
   `BillingProductIds.PREMIUM_SUBSCRIPTION` din cod).

3. **În interiorul acelui abonament**, adaugă două **Base Plans**:
   - ID `monthly` (facturare lunară, P1M)
   - ID `yearly` (facturare anuală, P1Y)

   Acestea trebuie să corespundă cu `BillingProductIds.BASE_PLAN_MONTHLY`
   și `BASE_PLAN_YEARLY`. Setează prețul de bază (RON) — Google
   calculează automat conversiile pentru alte monede/regiuni.

4. **Activează ambele base plans** (status "Active", nu "Draft").

5. **Adaugă conturi de test** (Setup → License testing) cu adresele
   Gmail ale dispozitivelor pe care testezi, ca să poți cumpăra fără
   să fii taxat real.

6. **Permisiune în AndroidManifest.xml** (Billing Library o cere automat,
   dar verifică):
   ```xml
   <uses-permission android:name="com.android.vending.BILLING" />
   ```

## Despre comportamentul implementării

- **Verificare la pornire + offline**: `BillingManager` încarcă instant
  starea din `PremiumStatusCache` (sincron, fără rețea), apoi pornește
  conexiunea reală la Google Play și actualizează starea silențios când
  răspunsul soseste. Cache-ul expiră după 72h fără reverificare reușită,
  pentru a evita acces Premium "blocat" la nesfârșit offline.

- **acknowledgePurchase**: se face automat în `handlePurchase()`, apelată
  din `purchasesUpdatedListener` (achiziție nouă) și din `refreshPurchases()`
  (verificare la pornire/resume). Fără acest pas, Google rambursează automat
  abonamentul după 3 zile.

- **Limita de 20 bilete**: `checkCanSaveNewTicket()` se apelează imediat
  înainte de salvarea efectivă a unui bilet nou (nu la deschiderea
  formularului), permițând utilizatorului să completeze liber, dar
  blocând explicit salvarea biletului #21 dacă nu e Premium.

## Ce NU acoperă acest exemplu (de adăugat în producție)

- Validare server-side a achizițiilor (Google Play Developer API), pentru
  protecție împotriva achizițiilor falsificate — recomandat puternic
  pentru orice aplicație cu venituri reale.
- Gestionarea reînnoirilor eșuate / grace period (Billing Library trimite
  notificări via Real-time Developer Notifications, nu prin acest SDK
  direct).
- Restore purchases UI explicit (deși `refreshPurchases()` la fiecare
  pornire acoperă majoritatea cazurilor automat).
