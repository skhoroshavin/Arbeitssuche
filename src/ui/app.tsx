import { Routes, Route, Navigate } from "react-router"
import { AppLayout } from "./layout"
import {
  ApplicantList,
  ApplicantLayout,
  ApplicantOverview,
  ApplicantEditPersonal,
  ApplicantEditExperience,
  ApplicantEditEducation,
  ApplicantEditCertifications,
  ApplicantEditOther,
  ApplicantWizardPage,
  JobSearchLayout,
  JobSearchConfig,
  JobSearchCoverLetter,
  JobSearchVacancyList,
  JobSearchVacancyDetail,
  JobSearchWizardPage,
  SettingsLayout,
  SettingsAI,
  SettingsMaps,
  DataClearedPage,
  FirstStartApplicantRoute,
  FirstStartJobSearchRoute,
  FirstStartSettingsStep,
  FirstStartWizard,
  SetupGuard,
} from "./pages"

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route element={<SetupGuard />}>
          <Route path="/" element={<ApplicantList />} />
        </Route>
        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<SettingsAI />} />
          <Route path="maps" element={<SettingsMaps />} />
        </Route>
        <Route path="/applicants/:id" element={<ApplicantLayout />}>
          <Route index element={<ApplicantOverview />} />
          <Route path="personal" element={<ApplicantEditPersonal />} />
          <Route path="experience" element={<ApplicantEditExperience />} />
          <Route path="education" element={<ApplicantEditEducation />} />
          <Route
            path="certifications"
            element={<ApplicantEditCertifications />}
          />
          <Route path="other" element={<ApplicantEditOther />} />
        </Route>
        <Route path="/job-searches/:id" element={<JobSearchLayout />}>
          <Route index element={<Navigate to="vacancies" replace />} />
          <Route path="config" element={<JobSearchConfig />} />
          <Route path="cover-letter" element={<JobSearchCoverLetter />} />
          <Route path="vacancies" element={<JobSearchVacancyList />} />
        </Route>
        <Route
          path="/job-searches/:id/vacancies/:hash"
          element={<JobSearchVacancyDetail />}
        />
      </Route>
      <Route path="/applicants/new" element={<ApplicantWizardPage />} />
      <Route
        path="/applicants/:applicantId/job-searches/new"
        element={<JobSearchWizardPage />}
      />
      <Route path="/first-start" element={<FirstStartWizard />}>
        <Route index element={<Navigate to="settings" replace />} />
        <Route path="settings" element={<FirstStartSettingsStep />} />
        <Route path="applicant" element={<FirstStartApplicantRoute />} />
        <Route path="job-search" element={<FirstStartJobSearchRoute />} />
        <Route
          path="job-search/:applicantId"
          element={<FirstStartJobSearchRoute />}
        />
      </Route>
      <Route path="/data-cleared" element={<DataClearedPage />} />
    </Routes>
  )
}
