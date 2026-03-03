import ClarifierPrompt from '../ClarifierPrompt'
import { bannerRow, bannerButtonPrimary, bannerButtonSecondary } from './styles'

const BANNER_CLASS = 'mt-2 mb-2 rounded-lg font-serif text-xs flex flex-wrap items-center gap-2'

export function ClarifierBannerPerson({ thoughtId, clarifierForThoughtId, clarifierForPersonId, linkedPeople, onClarifierSubmit, onClarifierDismiss }) {
  if (clarifierForThoughtId !== thoughtId || !clarifierForPersonId || !linkedPeople.some((p) => p.person_id === clarifierForPersonId)) return null
  if (!onClarifierSubmit || !onClarifierDismiss) return null
  const displayName = linkedPeople.find((p) => p.person_id === clarifierForPersonId)?.display_name || 'Someone'
  return (
    <div className="mt-2 mb-2">
      <ClarifierPrompt
        displayName={displayName}
        onSubmit={(value) => onClarifierSubmit(clarifierForPersonId, value)}
        onDismiss={onClarifierDismiss}
      />
    </div>
  )
}

export function ClarifierBannerNewPerson({ thoughtId, clarifierForNewPerson, onNewPersonClarifierComplete }) {
  if (!clarifierForNewPerson || String(clarifierForNewPerson.thoughtId) !== String(thoughtId)) return null
  if (!onNewPersonClarifierComplete) return null
  return (
    <div className="mt-2 mb-2">
      <ClarifierPrompt
        displayName={clarifierForNewPerson.name}
        promptMessage={`Got it — who is this ${clarifierForNewPerson.name}? Add a note to tell them apart (optional).`}
        onSubmit={(value) => onNewPersonClarifierComplete(thoughtId, clarifierForNewPerson.name, value)}
        onSkip={() => onNewPersonClarifierComplete(thoughtId, clarifierForNewPerson.name, null)}
        onDismiss={() => onNewPersonClarifierComplete(thoughtId, clarifierForNewPerson.name, null)}
      />
    </div>
  )
}

export function ConfirmationBanners({ thoughtId, confirmationList, onConfirmationChoose }) {
  if (!confirmationList?.length || !onConfirmationChoose) return null
  return (
    <>
      {confirmationList.map((item) => (
        <div key={item.name} className={BANNER_CLASS} style={bannerRow}>
          <span className="shrink-0" style={{ color: 'var(--ink)' }}>
            {item.person.clarifier
              ? `Is this ${item.person.clarifier}?`
              : `Is this the same ${item.name} you've mentioned before?`}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onConfirmationChoose(thoughtId, item.name, 'yes')}
              className="px-2 py-1 rounded border font-serif text-xs cursor-pointer hover:opacity-90 transition-opacity"
              style={bannerButtonPrimary}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => onConfirmationChoose(thoughtId, item.name, 'no')}
              className="px-2 py-1 rounded border font-serif text-xs cursor-pointer hover:opacity-90 transition-opacity"
              style={bannerButtonSecondary}
            >
              No, different person
            </button>
          </div>
        </div>
      ))}
    </>
  )
}

export function DisambiguationBanners({ thoughtId, disambiguationList, onDisambiguationChoose }) {
  if (!disambiguationList?.length || !onDisambiguationChoose) return null
  return (
    <>
      {disambiguationList.map((item) => (
        <div key={item.name} className={BANNER_CLASS} style={bannerRow}>
          <span className="shrink-0" style={{ color: 'var(--ink)' }}>
            Which {item.name}?
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {item.people.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onDisambiguationChoose(thoughtId, item.name, p.id)}
                className="px-2 py-1 rounded border font-serif text-xs cursor-pointer hover:opacity-90 transition-opacity"
                style={bannerButtonPrimary}
              >
                {p.display_name}
                {p.clarifier ? ` (${p.clarifier})` : ''}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onDisambiguationChoose(thoughtId, item.name, 'new')}
              className="px-2 py-1 rounded border border-dashed font-serif text-xs cursor-pointer hover:opacity-90 transition-opacity"
              style={bannerButtonSecondary}
            >
              Someone new
            </button>
          </div>
        </div>
      ))}
    </>
  )
}
