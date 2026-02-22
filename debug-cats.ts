import { getCollection } from 'astro:content';

async function debug() {
    const cats = await getCollection('categories');
    console.log('Category IDs in Collection:');
    cats.forEach(c => console.log(`- "${c.id}"`));
}

debug();
