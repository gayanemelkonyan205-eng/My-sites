const messages: Record<string, string> = {
  invalid_credentials: "Էլ․ փոստը կամ գաղտնաբառը սխալ է։",
  try_later: "Չափազանց շատ փորձեր։ Փորձեք մի փոքր ուշ։",
  profile_missing: "Այս հաշիվը դեռ միացված չէ դասարանին։",
  invalid_form: "Ստուգեք լրացված դաշտերը և փորձեք կրկին։",
  invalid_invite: "Հրավերի կոդը սխալ է։",
  registration_failed: "Չհաջողվեց ավարտել գրանցումը։ Փորձեք կրկին։",
  oauth_failed: "Google-ով մուտքը չհաջողվեց։",
  profile_failed: "Չհաջողվեց ստեղծել դասարանի պրոֆիլը։",
  invalid_password: "Գաղտնաբառերը պետք է համընկնեն և պարունակեն առնվազն 10 նիշ։",
  reset_failed: "Գաղտնաբառի փոփոխությունը չհաջողվեց։"
};

const notices: Record<string, string> = {
  verify_email: "Գրանցումն ավարտված է։ Ստուգեք էլ․ փոստը և հաստատեք հասցեն։",
  sent: "Եթե այդ հասցեով հաշիվ գոյություն ունի, վերականգնման նամակը ուղարկվել է։"
};

export function AuthMessage({ error, message }: { error?: string; message?: string }) {
  if (error) return <p role="alert" className="mb-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-[var(--danger)]">{messages[error] ?? "Գործողությունը չհաջողվեց։"}</p>;
  if (message) return <p className="mb-5 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-[var(--success)]">{notices[message] ?? message}</p>;
  return null;
}
