import { StrictMode, Component, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter } from "react-router"
import App from "./app"
import "./index.css"

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000 } },
})

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | undefined }
> {
  constructor(properties: { children: ReactNode }) {
    super(properties)
    this.state = { error: undefined }
  }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  override render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", fontFamily: "monospace" }}>
          <h2 style={{ color: "red" }}>Rendering Error</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

const root = document.querySelector("#root")
if (!root) throw new Error("Root element not found")

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
