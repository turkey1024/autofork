export default {
    async scheduled(controller, env, ctx) {
        console.log('🚀 随机fork任务开始:', new Date().toISOString());
        
        // 从环境变量获取Token
        const GITHUB_TOKEN = env.GITHUB_TOKEN;
        
        if (!GITHUB_TOKEN) {
            console.error('❌ GITHUB_TOKEN 环境变量未设置');
            return;
        }

        console.log('✅ 从环境变量获取Token成功, 长度:', GITHUB_TOKEN.length);

        try {
            // 验证Token有效性
            console.log('🔐 验证Token权限...');
            const authResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'Random-Fork-Bot',
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!authResponse.ok) {
                const error = await authResponse.text();
                console.error('❌ Token验证失败:', authResponse.status, error);
                return;
            }

            const userInfo = await authResponse.json();
            console.log('✅ Token有效, 操作账号:', userInfo.login);

            // 检查速率限制
            const rateLimitResponse = await fetch('https://api.github.com/rate_limit', {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'User-Agent': 'Random-Fork-Bot'
                }
            });
            
            if (rateLimitResponse.ok) {
                const rateLimit = await rateLimitResponse.json();
                console.log('📊 速率限制:', {
                    remaining: rateLimit.resources.core.remaining,
                    limit: rateLimit.resources.core.limit,
                    reset: new Date(rateLimit.resources.core.reset * 1000).toISOString()
                });
            }

            // 搜索随机仓库
            const randomPage = Math.floor(Math.random() * 10) + 1;
            console.log('🔍 搜索随机仓库, 页码:', randomPage);
            
            const searchResponse = await fetch(
                `https://api.github.com/search/repositories?q=stars:>100&sort=updated&page=${randomPage}&per_page=1`,
                {
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'User-Agent': 'Random-Fork-Bot',
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            console.log('🔍 搜索响应状态:', searchResponse.status);
            
            if (!searchResponse.ok) {
                const errorText = await searchResponse.text();
                console.error('❌ 搜索失败:', searchResponse.status, errorText);
                return;
            }

            const searchData = await searchResponse.json();
            console.log('🔍 找到仓库数量:', searchData.items?.length || 0);
            
            if (!searchData.items || searchData.items.length === 0) {
                console.error('❌ 未找到仓库');
                return;
            }

            const repo = searchData.items[0];
            const owner = repo.owner.login;
            const repoName = repo.name;
            
            console.log(`🎯 选中仓库: ${owner}/${repoName}`);
            console.log(`⭐ 星标数: ${repo.stargazers_count}`);
            console.log(`🔗 仓库URL: ${repo.html_url}`);

            // 执行fork操作
            console.log(`🔄 开始fork仓库...`);
            
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

            console.log('🔄 Fork响应状态:', forkResponse.status);
            
            if (forkResponse.status === 202) {
                const result = await forkResponse.json();
                console.log(`✅ 成功fork仓库: ${result.full_name}`);
                console.log(`🔗 Fork地址: ${result.html_url}`);
                console.log(`🆔 仓库ID: ${result.id}`);
            } else {
                const errorText = await forkResponse.text();
                console.error(`❌ Fork失败: ${forkResponse.status}`, errorText);
            }

        } catch (error) {
            console.error('💥  unexpected错误:', error.message);
            console.error('Stack:', error.stack);
        }
    },

    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        if (url.pathname === '/status') {
            const hasToken = !!env.GITHUB_TOKEN;
            return new Response(JSON.stringify({
                status: '运行中',
                has_token: hasToken,
                token_set: hasToken,
                environment: 'production',
                last_updated: new Date().toISOString()
            }, null, 2), {
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        return new Response('🎯 随机Fork机器人 - 环境变量版本\n\n访问 /status 查看状态', {
            headers: { 'Content-Type': 'text/plain' }
        });
    }
};

