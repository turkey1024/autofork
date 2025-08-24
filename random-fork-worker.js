export default {
    async scheduled(controller, env, ctx) {
        console.log('⏰ 10分钟定时任务启动:', new Date().toISOString());
        
        const GITHUB_TOKEN = env.GITHUB_TOKEN;
        if (!GITHUB_TOKEN) {
            console.error('❌ GITHUB_TOKEN 环境变量未设置');
            return;
        }

        // 18% 概率跳过本次执行
        const skipChance = Math.random();
        if (skipChance < 0.18) {
            console.log('⏭️ 随机跳过本次执行 (18% 概率)');
            console.log('🎲 随机值:', skipChance.toFixed(3));
            return;
        }

        console.log('✅ 执行本次任务 (82% 概率)');
        console.log('🎲 随机值:', skipChance.toFixed(3));

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
                    limit: rateLimit.resources.core.limit
                });
            }

            // 搜索随机仓库
            const randomPage = Math.floor(Math.random() * 10) + 1;
            console.log('🔍 搜索随机仓库, 页码:', randomPage);
            
            const searchResponse = await fetch(
                `https://api.github.com/search/repositories?q=is:public&sort=updated&page=${randomPage}&per_page=1`,
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

            // 添加随机延迟（0-30秒），进一步降低检测风险
            const randomDelay = Math.floor(Math.random() * 30000);
            console.log(`⏳ 随机延迟 ${randomDelay/1000} 秒后执行fork`);
            await new Promise(resolve => setTimeout(resolve, randomDelay));

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
                console.log('🎉 任务完成！');
            } else {
                const errorText = await forkResponse.text();
                console.error(`❌ Fork失败: ${forkResponse.status}`, errorText);
            }

        } catch (error) {
            console.error('💥 意外错误:', error.message);
        }
        
        console.log('⏰ 下次执行约在10分钟后');
    },

    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        if (url.pathname === '/status') {
            return new Response(JSON.stringify({
                status: '运行中',
                schedule: '每10分钟一次',
                skip_chance: '18%',
                has_token: !!env.GITHUB_TOKEN,
                last_updated: new Date().toISOString(),
                description: '每10分钟执行一次，有18%概率跳过'
            }, null, 2), {
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }
        
        if (url.pathname === '/test-skip') {
            const randomValue = Math.random();
            const willSkip = randomValue < 0.18;
            return new Response(JSON.stringify({
                test: '跳过概率测试',
                random_value: randomValue.toFixed(3),
                will_skip: willSkip,
                skip_chance: '18%'
            }, null, 2), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response('⏰ 智能Fork机器人 - 10分钟间隔\n\n' +
                           '• 每10分钟执行一次\n' +
                           '• 18% 概率随机跳过\n' +
                           '• 安全模式降低风险\n\n' +
                           '端点:\n' +
                           '/status - 查看状态\n' +
                           '/test-skip - 测试跳过概率', {
            headers: { 'Content-Type': 'text/plain' }
        });
    }
};
