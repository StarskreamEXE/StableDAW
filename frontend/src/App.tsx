/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { Shell } from './components/layout/Shell';
import { PlayerFooter } from './components/audio/PlayerFooter';
import { logInfo } from './state/logStore';

export default function App() {
  useEffect(() => {
    logInfo('system', 'StableDAW UI initialized');
  }, []);

  return (
    <>
      <Shell>
        {/* The Shell component currently handles its own internal routing for this barebones demo */}
      </Shell>
      <PlayerFooter />
    </>
  );
}
