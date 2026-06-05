export const MAIN_FLOW_SEED = {
  applicant: {
    personal: {
      name: "E2E Happy Path",
      email: "happy.path@example.com",
      phone: "+49 30 1234567",
      birthdate: "1990-01-15",
      gender: "Divers",
      street: "Friedrichstraße 100",
      zip: "10117",
      city: "Berlin",
    },
    experience: {
      role: "Sachbearbeiter Kundenservice",
      company: "Muster GmbH",
      startDate: "2021-01",
      endDate: "2024-05",
      location: "Berlin",
      highlights: "Kundenanliegen dokumentiert\nTermine koordiniert",
    },
    education: {
      institution: "OSZ Handel I",
      course: "Kaufmännische Ausbildung",
      startDate: "2016-08",
      endDate: "2019-06",
      location: "Berlin",
      highlights: "Verwaltung\nKorrespondenz",
    },
    certification: {
      name: "SAP Grundlagen",
      issuer: "IHK Berlin",
      date: "2023-09",
      description: "Grundlagen der Sachbearbeitung",
    },
    other: {
      skill: "MS Office",
      language: "Deutsch",
      level: "C2",
      hobbies: "Lesen, Wandern",
      personalNote:
        "Bevorzugt strukturierte Sachbearbeitung und klare Prozesse.",
    },
  },
  jobSearch: {
    searchTerm: "Sachbearbeiter",
    maxResultsPerSource: "3",
    sources: ["arbeitsagentur", "xing"] as const,
    appointmentDate: "2026-06-15",
  },
  resumeTemplateLabel: "Klassisch",
} as const
