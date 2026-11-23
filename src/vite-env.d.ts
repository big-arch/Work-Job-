/// <reference types="vite/client" />

interface Document {
  startViewTransition?: (update: () => void) => { finished: Promise<void> }
}

interface CSSStyleDeclaration {
  viewTransitionName: string
  viewTransitionClass: string
}
