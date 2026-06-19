import { describe, it, expect } from 'vitest'
import { assignRoles } from '../setup'

describe('assignRoles', () => {
  it('assigne exactement 1 mutant_base avec etat=mutant et genome=hote', () => {
    const state = assignRoles(['A','B','C','D','E','F','G','H'], ['informaticien'])
    const base = state.players.filter(p => p.role === 'mutant_base')
    expect(base).toHaveLength(1)
    expect(base[0].etat).toBe('mutant')
    expect(base[0].genome).toBe('hote')
  })

  it('assigne exactement 2 médecins avec genome=normal et etat=sain', () => {
    const state = assignRoles(['A','B','C','D','E','F','G','H'], [])
    const medecins = state.players.filter(p => p.role === 'medecin')
    expect(medecins).toHaveLength(2)
    medecins.forEach(m => {
      expect(m.genome).toBe('normal')
      expect(m.etat).toBe('sain')
    })
  })

  it('assigne exactement 1 hote et 1 resistant parmi les non-mutant-non-medecin', () => {
    const state = assignRoles(['A','B','C','D','E','F','G','H'], [])
    const others = state.players.filter(p => p.role !== 'mutant_base' && p.role !== 'medecin')
    const hotes = others.filter(p => p.genome === 'hote')
    const resistants = others.filter(p => p.genome === 'resistant')
    expect(hotes).toHaveLength(1)
    expect(resistants).toHaveLength(1)
  })

  it('tous les joueurs hors mutant_base commencent sain', () => {
    const state = assignRoles(['A','B','C','D','E','F','G','H'], [])
    state.players.filter(p => p.role !== 'mutant_base').forEach(p => {
      expect(p.etat).toBe('sain')
    })
  })

  it('les rôles optionnels activés sont présents', () => {
    const state = assignRoles(
      ['A','B','C','D','E','F','G','H','I'],
      ['informaticien', 'psychologue']
    )
    const roles = state.players.map(p => p.role)
    expect(roles).toContain('informaticien')
    expect(roles).toContain('psychologue')
  })

  it('les joueurs restants sont astronautes', () => {
    const state = assignRoles(['A','B','C','D','E','F','G','H'], ['informaticien'])
    const astros = state.players.filter(p => p.role === 'astronaute')
    expect(astros.length).toBeGreaterThanOrEqual(1)
    expect(state.players).toHaveLength(8)
  })

  it('phase initiale = distribution', () => {
    const state = assignRoles(['A','B','C','D','E','F','G','H'], [])
    expect(state.phase).toBe('distribution')
  })

  it("l'ordre d'affichage ne révèle pas les rôles (mutant pas toujours en tête)", () => {
    // Régression : l'ordre d'attribution est déterministe par position
    // (mutant, médecins, ...). Si le tableau final n'était pas mélangé, le
    // 1er joueur de la liste de distribution serait toujours le mutant.
    const names = ['A','B','C','D','E','F','G','H']
    const mutantPositions = new Set<number>()
    for (let run = 0; run < 50; run++) {
      const state = assignRoles(names, ['informaticien'])
      mutantPositions.add(state.players.findIndex(p => p.role === 'mutant_base'))
    }
    // Sur 50 tirages, la position du mutant doit varier — sinon l'ordre fuit le rôle.
    expect(mutantPositions.size).toBeGreaterThan(1)
  })
})
