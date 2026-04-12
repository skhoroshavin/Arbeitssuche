import type { VacancyContact } from "@/models/vacancy"

export function VacancyContactSection({
  contact,
}: {
  contact: VacancyContact
}) {
  if (!contact.name && !contact.email && !contact.phone) return

  return (
    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Ansprechpartner
      </h3>
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
        <ContactField value={contact.name} />
        <ContactField value={contact.email} href={`mailto:${contact.email}`} />
        <ContactField value={contact.phone} href={`tel:${contact.phone}`} />
      </div>
    </div>
  )
}

function ContactField({ value, href }: { value?: string; href?: string }) {
  if (!value) return
  return (
    <div>
      {href ? (
        <a href={href} className="text-blue-600 hover:underline">
          {value}
        </a>
      ) : (
        value
      )}
    </div>
  )
}
