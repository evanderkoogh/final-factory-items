import * as fs from 'fs/promises'
import { json2csv } from 'json-2-csv'

type Recipe = { id: string; in: Record<string, number>; out: Record<string, number> }
type Machine = { drain: number; speed: number; usage: number }
interface Item {
	id: string
	name: string
	category: string
	stack: number
	machine?: Machine
}

interface EnrichedItem extends Item {
	mass?: number
	singularity_power?: number
}

const massLookup: Record<string, number> = {
	'exotic-matter': 2000,
	'bauxite-ore': 30,
	ice: 55,
	'iron-ore': 74,
	'organic-compounds': 60,
	'silica-ore': 40,
	'urso-citizen': 90,
}

function makeRecipeLookup(recipes: Recipe[]): Record<string, Recipe> {
	const recipeLookup: Record<string, Recipe> = {}
	for (const recipe of recipes) {
		recipeLookup[recipe.id] = recipe
	}
	return recipeLookup
}

const data = JSON.parse(await fs.readFile('./labs.json', { encoding: 'utf-8' }))
const recipeLookup = makeRecipeLookup(data.recipes)

function getMass(id: string): number {
	const recipe = recipeLookup[id]
	if (massLookup[id]) {
		return massLookup[id]
	} else {
		if (recipe) {
			const inputs = Object.entries(recipe.in)
			const totalMass = inputs.reduce((accMass, [id, amount]) => {
				const ingredientMass = massLookup[id] ? massLookup[id] : getMass(id)
				return accMass + ingredientMass * amount
			}, 0)
			return totalMass
		} else {
			throw new Error(`Can't find recipe: ${id}`)
		}
	}
}

function getPower(id: string): number {
	const mass = getMass(id)
	const massToPowerCoefficient = 50
	const minPower = 50
	return mass * (1 / 100) * massToPowerCoefficient + minPower
}

const items: Item[] = data.items
const enriched: EnrichedItem[] = items.map((item) => {
	if (item.id === 'ancient-tech-trash' || item.id === 'comet-core') {
		return { ...item, mass: 0, singularity_power: 0 }
	} else {
		try {
			const mass = massLookup[item.id]
			const power = getPower(item.id)
			return { ...item, mass, singularity_power: Math.round(power) }
		} catch (error) {
			return { ...item }
		}
	}
})

const csv = json2csv(enriched, {
	emptyFieldValue: '',
	keys: [
		'id',
		'name',
		'category',
		'stack',
		'machine.drain',
		'machine.speed',
		'machine.usage',
		'mass',
		'singularity_power',
		'belt.speed',
	],
})
await fs.writeFile('./items.csv', csv)
