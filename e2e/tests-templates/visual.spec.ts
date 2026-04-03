import { test, expect } from "@playwright/test"
import path from "node:path"
import { renderHTML } from "../../src/services/resume-renderer/renderer.js"
import { pdf } from "pdf-to-img"

const templatesDir = path.resolve(
  import.meta.dirname,
  "../../src/services/resume-renderer/templates",
)

const resumeData = {
  personal: {
    name: "Maria Schmidt",
    email: "maria@example.de",
    phone: "+49 170 1234567",
    location: "Musterstr. 1, 10115, Berlin",
  },
  experience: [
    {
      role: "Senior Entwicklerin",
      company: "TechCorp GmbH",
      startDate: "2021",
      endDate: "2024",
      location: "Berlin",
      highlights: [
        "Led cross-functional team of 5 engineers across 3 time zones",
        "Reduced CI/CD build time by 40% through pipeline optimization",
        "Migrated legacy monolith to microservices architecture",
        "Introduced end-to-end testing with 90% coverage",
      ],
    },
    {
      role: "Entwicklerin",
      company: "StartupXY",
      startDate: "2018",
      endDate: "2021",
      location: "München",
      highlights: [
        "Built real-time data processing pipeline handling 10k events/sec",
        "Designed and implemented RESTful API serving 50k daily users",
        "Mentored 3 junior developers through onboarding program",
      ],
    },
    {
      role: "Junior Entwicklerin",
      company: "WebAgentur Berlin",
      startDate: "2016",
      endDate: "2018",
      location: "Berlin",
      highlights: [
        "Developed responsive web applications for enterprise clients",
        "Implemented automated testing reducing bug reports by 60%",
        "Created reusable component library used across 12 projects",
      ],
    },
    {
      role: "Werkstudentin",
      company: "DataVision GmbH",
      startDate: "2014",
      endDate: "2016",
      location: "Potsdam",
      highlights: [
        "Built data visualization dashboards using D3.js and React",
        "Optimized database queries reducing response times by 70%",
      ],
    },
    {
      role: "Praktikantin",
      company: "InnoTech Solutions",
      startDate: "2013",
      endDate: "2014",
      location: "Hamburg",
      highlights: [
        "Assisted in development of internal project management tool",
        "Implemented automated reporting system for weekly metrics",
      ],
    },
  ],
  education: [
    {
      institution: "TU Berlin",
      course: "M.Sc. Informatik",
      startDate: "2015",
      endDate: "2018",
      location: "Berlin",
      highlights: [
        "Note 1.3",
        "Stipendium der Studienstiftung",
        "Published thesis on distributed systems",
      ],
    },
    {
      institution: "FU Berlin",
      course: "B.Sc. Informatik",
      startDate: "2011",
      endDate: "2015",
      location: "Berlin",
      highlights: ["Note 1.7", "Tutor für Algorithmen und Datenstrukturen"],
    },
  ],
  skills: [
    "TypeScript",
    "React",
    "Node.js",
    "PostgreSQL",
    "Python",
    "Docker",
    "Kubernetes",
    "AWS",
    "GraphQL",
    "Redis",
    "Elasticsearch",
    "Terraform",
  ],
  languages: [
    { language: "Deutsch", level: "Muttersprachlich" },
    { language: "Englisch", level: "C1" },
    { language: "Französisch", level: "B1" },
    { language: "Spanisch", level: "A2" },
  ],
  certifications: [
    {
      name: "AWS Solutions Architect Professional",
      issuer: "Amazon Web Services",
      date: "2023",
      description: "Professional level cloud architecture certification",
    },
    {
      name: "Certified Kubernetes Administrator",
      issuer: "Cloud Native Computing Foundation",
      date: "2022",
      description: "Container orchestration and cluster management",
    },
    {
      name: "Google Cloud Professional Data Engineer",
      issuer: "Google Cloud",
      date: "2021",
      description: "Data pipeline design and machine learning integration",
    },
  ],
  hobbies: ["Wandern", "Fotografie", "Open Source", "Bouldern"],
}

async function renderPdfPages(
  page: import("@playwright/test").Page,
  html: string,
): Promise<Buffer[]> {
  await page.setContent(html, { waitUntil: "networkidle" })

  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: { top: "0", bottom: "0", left: "0", right: "0" },
    printBackground: true,
  })

  const pages: Buffer[] = []
  for await (const image of await pdf(pdfBuffer, { scale: 2 })) {
    pages.push(Buffer.from(image))
  }
  return pages
}

const RESUME_TEMPLATES = [
  "resume_classic",
  "resume_modern",
  "resume_elegant",
  "resume_minimal",
] as const

for (const template of RESUME_TEMPLATES) {
  test(`${template}`, async ({ page }) => {
    const html = renderHTML(templatesDir, template, resumeData)
    const pages = await renderPdfPages(page, html)

    expect(pages.length).toBeGreaterThanOrEqual(2)
    for (let i = 0; i < pages.length; i++) {
      expect(pages[i]).toMatchSnapshot(`${template}-page${i + 1}.png`)
    }
  })
}
