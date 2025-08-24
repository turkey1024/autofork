// 在这里直接设置你的 GitHub Token
const GITHUB_TOKEN = "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";

export default {
    async scheduled(controller, env, ctx) {
        console.log('🚀 Scheduled task started at:', new Date().toISOString());
        
        if (!GITHUB_TOKEN || GITHUB_TOKEN === "ghp_your_actual_token_here") {
            console.error('❌ Please set your actual GitHub token in the code');
            return;
        }

        console.log('✅ Using hardcoded GITHUB_TOKEN, length:', GITHUB_TOKEN.length);

        try {
            // 检查速率限制
            const rateLimitResponse = await fetch('https://api.github.com/rate_limit', {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'Random-Fork-Bot'
                }
            });
            
            if (rateLimitResponse.ok) {
                const rateLimit = await rateLimitResponse.json();
                console.log('📊 Rate limit:', JSON.stringify(rateLimit.resources));
            }

            // 获取随机仓库
            const randomPage = Math.floor(Math.random() * 10) + 1;
            console.log('🔍 Searching page:', randomPage);
            
            const searchResponse = await fetch(
                `https://api.github.com/search/repositories?q=stars:>100&sort=stars&page=${randomPage}&per_page=1`,
                {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'User-Agent': 'Random-Fork-Bot',
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            console.log('🔍 Search response status:', searchResponse.status);
            
            if (!searchResponse.ok) {
                const errorText = await searchResponse.text();
                console.error('❌ Search failed:', searchResponse.status, errorText);
                return;
            }

            const searchData = await searchResponse.json();
            console.log('🔍 Search results count:', searchData.items?.length || 0);
            
            if (!searchData.items || searchData.items.length === 0) {
                console.error('❌ No repositories found');
                return;
            }

            const repo = searchData.items[0];
            const owner = repo.owner.login;
            const repoName = repo.name;
            
            console.log(`🎯 Selected repository: ${owner}/${repoName}`);
            console.log(`🔗 Repository URL: ${repo.html_url}`);
            console.log(`⭐ Stars: ${repo.stargazers_count}`);

            // 执行 fork
            console.log(`🔄 Attempting to fork ${owner}/${repoName}...`);
            
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

            console.log('🔄 Fork response status:', forkResponse.status);
            
            if (forkResponse.status === 202) {
                const result = await forkResponse.json();
                console.log(`✅ Successfully forked: ${result.full_name}`);
                console.log(`🔗 Fork URL: ${result.html_url}`);
                console.log(`📅 Created at: ${result.created_at}`);
            } else if (forkResponse.status === 403) {
                console.error('❌ Forbidden - 速率限制或权限问题');
                const errorText = await forkResponse.text();
                console.error('Error details:', errorText);
            } else {
                console.error(`❌ Fork failed: ${forkResponse.status}`);
                const errorText = await forkResponse.text();
                console.error('Error details:', errorText);
            }

        } catch (error) {
            console.error('💥 Unexpected error:', error.message);
        }
    },

    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        if (url.pathname === '/status') {
            return new Response(JSON.stringify({
                status: 'active',
                has_token: !!GITHUB_TOKEN && GITHUB_TOKEN !== "ghp_your_actual_token_here",
                token_set: GITHUB_TOKEN !== "ghp_your_actual_token_here",
                scheduled: 'every 5 minutes',
                last_run: new Date().toISOString()
            }, null, 2), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response('Random Fork Bot - Hardcoded Token Version\n\nVisit /status for bot status', {
            headers: { 'Content-Type': 'text/plain' }
        });
    }
};
