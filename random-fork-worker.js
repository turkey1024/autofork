export default {
    async scheduled(controller, env, ctx) {
        console.log('🚀 Scheduled task started at:', new Date().toISOString());
        
        // 正确访问环境变量
        const GITHUB_TOKEN = env.GITHUB_TOKEN;
        if (!GITHUB_TOKEN) {
            console.error('❌ GITHUB_TOKEN environment variable is not set in scheduled event');
            console.log('Available environment variables:', Object.keys(env));
            return;
        }

        console.log('✅ GITHUB_TOKEN is available, length:', GITHUB_TOKEN.length);

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
                console.log('📊 Rate limit:', JSON.stringify(rateLimit));
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
                console.error('❌ No repositories found in search results');
                return;
            }

            const repo = searchData.items[0];
            const owner = repo.owner.login;
            const repoName = repo.name;
            
            console.log(`🎯 Selected repository: ${owner}/${repoName}`);
            console.log(`🔗 Repository URL: ${repo.html_url}`);

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
                console.log(`🆔 Fork ID: ${result.id}`);
            } else if (forkResponse.status === 403) {
                console.error('❌ Forbidden - 可能是速率限制或权限问题');
                const errorText = await forkResponse.text();
                console.error('Error details:', errorText);
            } else {
                console.error(`❌ Fork failed with status: ${forkResponse.status}`);
                const errorText = await forkResponse.text();
                console.error('Error details:', errorText);
            }

        } catch (error) {
            console.error('💥 Unexpected error:', error.message);
            console.error('Stack:', error.stack);
        }
    },

    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // 调试端点：检查环境变量
        if (url.pathname === '/debug') {
            return new Response(JSON.stringify({
                success: true,
                has_github_token: !!env.GITHUB_TOKEN,
                token_length: env.GITHUB_TOKEN ? env.GITHUB_TOKEN.length : 0,
                all_env_vars: Object.keys(env),
                message: 'This shows environment variables in fetch event'
            }, null, 2), {
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        // 手动触发 scheduled 任务的端点
        if (url.pathname === '/trigger') {
            try {
                // 模拟 scheduled 事件
                const GITHUB_TOKEN = env.GITHUB_TOKEN;
                if (!GITHUB_TOKEN) {
                    return new Response(JSON.stringify({
                        error: 'GITHUB_TOKEN not set in manual trigger'
                    }), { status: 500 });
                }
                
                // 这里可以调用你的 fork 逻辑
                return new Response(JSON.stringify({
                    message: 'Manual trigger received',
                    has_token: !!GITHUB_TOKEN,
                    token_length: GITHUB_TOKEN.length
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
                
            } catch (error) {
                return new Response(JSON.stringify({
                    error: error.message
                }), { status: 500 });
            }
        }

        return new Response('Random Fork Bot - Scheduled Worker\n\nEndpoints:\n/debug - Check environment variables\n/trigger - Manual trigger', {
            headers: { 'Content-Type': 'text/plain' }
        });
    }
};

