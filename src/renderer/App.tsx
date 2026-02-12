import { useAppStore } from './stores/appStore'
import { OverlayPanel } from './components/OverlayPanel'
import { CollapsedPill } from './components/CollapsedPill'

export default function App() {
  const isCollapsed = useAppStore((s) => s.isCollapsed)

  if (isCollapsed) {
    return <CollapsedPill />
  }

  return <OverlayPanel />
}
