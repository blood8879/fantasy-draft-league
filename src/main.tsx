import { createRoot } from "react-dom/client"
import { App } from "./App"
import { MissingRootError } from "./domain/errors"
import "./styles.css"

const rootElement = document.getElementById("root")

if (rootElement === null) {
  throw new MissingRootError()
}

createRoot(rootElement).render(<App />)
