# Component Spec: HowToPlaySteps

## Descripción
Tutorial interactivo paso a paso del gameplay. Muestra reglas, ejemplos visuales, y flujo de juego. Diseño con scroll horizontal en desktop, vertical en mobile.

---

## Props Interface

```typescript
interface GameStep {
  step: number;
  title: string;
  description: string;
  visual: React.ReactNode; // Ilustración o ejemplo
  tip?: string; // Optional pro tip
}

interface HowToPlayStepsProps {
  onComplete?: () => void; // Callback al llegar al final
  autoplay?: boolean; // Auto-advance cada 5s
}
```

---

## Steps Predefinidos

```typescript
const gameSteps: GameStep[] = [
  {
    step: 1,
    title: 'Get Matched',
    description: 'Join the queue and get matched with an opponent of similar skill level.',
    visual: <MatchmakingIllustration />,
    tip: 'Games usually start within 10 seconds!',
  },
  {
    step: 2,
    title: 'Random Starting Player',
    description: 'A random football player is selected as the starting point.',
    visual: <PlayerCardExample name="Lionel Messi" team="Barcelona" />,
  },
  {
    step: 3,
    title: 'Name a Teammate',
    description: 'Type the name of a player who shared a team with the current player.',
    visual: <AutocompleteExample />,
    tip: 'Use the autocomplete to find players quickly!',
  },
  {
    step: 4,
    title: 'Keep the Chain Going',
    description: 'Players alternate turns. Each new player must have been teammates with the previous one.',
    visual: <ChainExample players={['Messi', 'Busquets', 'Xavi']} />,
  },
  {
    step: 5,
    title: 'Avoid Repetitions',
    description: 'You cannot name a player already used in this match.',
    visual: <ErrorExample message="Player already used!" />,
  },
  {
    step: 6,
    title: 'Watch the Clock',
    description: 'You have 30 seconds per turn. Run out of time and you lose!',
    visual: <TimerExample seconds={30} />,
  },
  {
    step: 7,
    title: 'Win & Earn ELO',
    description: 'Make your opponent run out of time or force an invalid answer to win and gain ELO points.',
    visual: <ELODeltaExample delta={+15} />,
  },
];
```

---

## Layout (Desktop - Horizontal Scroll)

```
┌──────────────────────────────────────────────────────┐
│  Step 1        Step 2        Step 3        Step 4    │
│  [Get          [Random       [Name a       [Keep     │
│   Matched]      Starting]     Teammate]     Chain]   │
│                                                       │
│  < Prev                                   Next >      │
└──────────────────────────────────────────────────────┘
```

---

## Layout (Mobile - Vertical Stack)

```
┌──────────────────────┐
│  Step 1 / 7          │
│                      │
│  Get Matched         │
│  [Illustration]      │
│  Join the queue...   │
│                      │
│  💡 Tip: Games       │
│     start in 10s!    │
│                      │
│  [Next →]           │
└──────────────────────┘
```

---

## Implementación (código de ejemplo)

```tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const gameSteps: GameStep[] = [
  // ... (steps definidos arriba)
];

export function HowToPlaySteps({ onComplete, autoplay = false }: HowToPlayStepsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = gameSteps.length;
  
  // Autoplay
  useEffect(() => {
    if (!autoplay) return;
    
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev === totalSteps - 1) {
          onComplete?.();
          return prev; // Stay on last step
        }
        return prev + 1;
      });
    }, 5000);
    
    return () => clearInterval(timer);
  }, [autoplay, totalSteps, onComplete]);
  
  const goToNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete?.();
    }
  };
  
  const goToPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const step = gameSteps[currentStep];
  
  return (
    <section className="py-20 px-4 bg-gray-900">
      <div className="max-w-4xl mx-auto">
        
        {/* Section Title */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            How to Play
          </h2>
          <p className="text-xl text-gray-400">
            Master the game in 7 simple steps
          </p>
        </div>
        
        {/* Step Indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {gameSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`
                w-3 h-3 rounded-full transition-all
                ${index === currentStep
                  ? 'bg-blue-500 w-8'
                  : index < currentStep
                  ? 'bg-green-500'
                  : 'bg-gray-700'
                }
              `}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
        
        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.4 }}
            className="bg-gray-800 rounded-2xl p-8 md:p-12 min-h-[400px] flex flex-col"
          >
            {/* Step Number */}
            <div className="flex items-center gap-4 mb-6">
              <div className="
                w-12 h-12 rounded-full bg-blue-600
                flex items-center justify-center
                text-xl font-bold
              ">
                {step.step}
              </div>
              <div>
                <p className="text-sm text-gray-400">Step {step.step} of {totalSteps}</p>
                <h3 className="text-2xl font-bold">{step.title}</h3>
              </div>
            </div>
            
            {/* Description */}
            <p className="text-lg text-gray-300 mb-6">
              {step.description}
            </p>
            
            {/* Visual */}
            <div className="flex-grow flex items-center justify-center mb-6">
              {step.visual}
            </div>
            
            {/* Tip */}
            {step.tip && (
              <div className="
                p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg
                flex items-start gap-3
              ">
                <span className="text-2xl">💡</span>
                <p className="text-sm text-yellow-200">{step.tip}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        
        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={goToPrev}
            disabled={currentStep === 0}
            className="
              px-6 py-3 bg-gray-800 hover:bg-gray-700
              rounded-lg font-semibold transition
              disabled:opacity-30 disabled:cursor-not-allowed
              flex items-center gap-2
            "
          >
            <ChevronLeftIcon className="w-5 h-5" />
            <span>Previous</span>
          </button>
          
          <button
            onClick={goToNext}
            className="
              px-6 py-3 bg-blue-600 hover:bg-blue-700
              rounded-lg font-semibold transition
              flex items-center gap-2
            "
          >
            <span>{currentStep === totalSteps - 1 ? 'Start Playing' : 'Next'}</span>
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
        
        {/* Keyboard Shortcuts Hint */}
        <p className="text-center text-sm text-gray-500 mt-4">
          Use arrow keys ← → to navigate
        </p>
      </div>
    </section>
  );
}
```

---

## Visual Components (Ejemplos simplificados)

```tsx
function PlayerCardExample({ name, team }: { name: string; team: string }) {
  return (
    <div className="w-64 p-6 bg-gray-700 rounded-xl text-center">
      <div className="w-20 h-20 rounded-full bg-blue-500 mx-auto mb-4 flex items-center justify-center text-3xl">
        ⚽
      </div>
      <h4 className="text-xl font-bold mb-1">{name}</h4>
      <p className="text-gray-400 text-sm">{team}</p>
    </div>
  );
}

function ChainExample({ players }: { players: string[] }) {
  return (
    <div className="flex gap-2 items-center">
      {players.map((player, i) => (
        <React.Fragment key={player}>
          <div className="px-4 py-2 bg-blue-600 rounded-lg font-semibold">
            {player}
          </div>
          {i < players.length - 1 && (
            <span className="text-gray-400">→</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function TimerExample({ seconds }: { seconds: number }) {
  return (
    <div className="w-32 h-32 rounded-full border-8 border-yellow-500 flex items-center justify-center">
      <span className="text-4xl font-bold text-yellow-500">{seconds}s</span>
    </div>
  );
}
```

---

## Keyboard Navigation

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'ArrowLeft') goToPrev();
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [currentStep]);
```

---

## Accessibility

- [ ] Step indicators have descriptive labels
- [ ] Current step announced to screen readers
- [ ] Navigation buttons keyboard accessible
- [ ] Arrow key navigation works
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Color contrast >= 4.5:1 on all text

---

## Testing

### Unit Tests
- [ ] Next/Prev buttons update currentStep
- [ ] Step indicator dots reflect current step
- [ ] Last step calls onComplete
- [ ] Keyboard navigation works
- [ ] Autoplay advances steps every 5s

### E2E Tests
```typescript
test('how to play tutorial navigates correctly', async ({ page }) => {
  await page.goto('/#how-to-play');
  
  await expect(page.locator('h3')).toContainText('Get Matched');
  
  await page.getByRole('button', { name: 'Next' }).click();
  
  await expect(page.locator('h3')).toContainText('Random Starting Player');
  
  // Test keyboard nav
  await page.keyboard.press('ArrowRight');
  
  await expect(page.locator('h3')).toContainText('Name a Teammate');
});
```

---

## Variante: Modal Tutorial (First-time Users)

```tsx
import { Dialog } from '@headlessui/react';

function TutorialModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const handleComplete = () => {
    localStorage.setItem('tutorialCompleted', 'true');
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <Dialog.Panel className="max-w-4xl w-full max-h-[90vh] overflow-auto">
          <HowToPlaySteps onComplete={handleComplete} />
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
```

---

## Notas para Frontend Architect

1. **First-Time Experience:** Mostrar este tutorial automáticamente la primera vez que usuario entra (check `localStorage`).

2. **Skip Option:** Agregar botón "Skip Tutorial" para usuarios que ya conocen el juego.

3. **Animaciones:** Usar `AnimatePresence` con `mode="wait"` para evitar overlap entre steps.

4. **Visual Assets:** Los diagramas/ilustraciones pueden ser SVGs custom o screenshots del juego real.

5. **Internacionalización:** Todos los textos deben venir de archivos i18n para soporte multi-idioma futuro.

6. **Analytics:** Trackear en qué step los usuarios abandonan el tutorial (para identificar confusión).
