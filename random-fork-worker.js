export default {
    async scheduled(event, env, ctx) {
        try {
            const GITHUB_TOKEN = env.GITHUB_TOKEN;
            
            if (!GITHUB_TOKEN) {
                throw new Error('GITHUB_TOKEN environment variable is not set');
            }

            const randomPage = Math.floor(Math.random() * 100) + 1;
            
            const searchResponse = await fetch(
                `https://api.github.com/search/repositories?q=stars:>50&sort=updated&page=${randomPage}&per_page=1`,
                {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'User-Agent': 'Random-Fork-Bot',
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!searchResponse.ok) {
                throw new Error(`Search failed: ${searchResponse.status}`);
            }

            const searchData = await searchResponse.json();
            
            if (!searchData.items || searchData.items.length === 0) {
                throw new Error('No repositories found');
            }

            const repo = searchData.items[0];
            const owner = repo.owner.login;
            const repoName = repo.name;

            const forkResponse = await fetch(
                `https://api.github.com/repos/${owner}/${repoName}/forks`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'User-Agent': 'Random-Fork-Bot',
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (forkResponse.status === 202) {
                console.log(`✅ Forked: ${owner}/${repoName} at ${new Date().toISOString()}`);
            } else {
                console.error(`❌ Fork failed: ${forkResponse.status}`);
            }

        } catch (error) {
            console.error('Error:', error.message);
        }
    },

    async fetch(request, env, ctx) {
        return new Response('Random Fork Bot - Active\n\nEnvironment: ' + JSON.stringify({
            has_token: !!env.GITHUB_TOKEN,
            token_length: env.GITHUB_TOKEN ? env.GITHUB_TOKEN.length : 0
        }, null, 2), {
            headers: { 'Content-Type': 'text/plain' }
        });
    }
};

