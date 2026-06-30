const DEFAULT_EVM_RPC_URLS = Object.freeze({
    ethereum: 'https://ethereum-rpc.publicnode.com',
    optimism: 'https://optimism-rpc.publicnode.com',
    bsc: 'https://bsc-rpc.publicnode.com',
    polygon: 'https://polygon-bor-rpc.publicnode.com',
    base: 'https://base.llamarpc.com',
    arbitrum: 'https://arbitrum-one-rpc.publicnode.com',
    avalanche: 'https://api.avax.network/ext/bc/C/rpc',
    linea: 'https://linea-rpc.publicnode.com',
    scroll: 'https://rpc.scroll.io',
    mantle: 'https://mantle-rpc.publicnode.com',
    blast: 'https://rpc.blast.io',
    mode: 'https://mainnet.mode.network',

    sonic: 'https://rpc.soniclabs.com',
    berachain: 'https://berachain-rpc.publicnode.com',
    ronin: 'https://ronin.drpc.org',
    unichain: 'https://sepolia.unichain.org',
    hyperevm: 'https://rpc.hypurrscan.io',
    plasma: 'https://rpc.plasma.to',
    etherlink: 'https://node.mainnet.etherlink.com',
    monad: 'https://monad-mainnet.drpc.org',
    megaeth: 'https://mainnet.megaeth.com/rpc',

    zksync: 'https://mainnet.era.zksync.io',
    moonbeam: 'https://rpc.api.moonbeam.network',
    boba: 'https://mainnet.boba.network',
    gnosis: 'https://rpc.gnosischain.com',
    rootstock: 'https://public-node.rsk.co',
    'polygon-zkevm': 'https://zkevm-rpc.com',
    taiko: 'https://rpc.mainnet.taiko.xyz',
    sei: 'https://evm-rpc.sei-apis.com',
    filecoin: 'https://api.node.glif.io/rpc/v1',
    celo: 'https://forno.celo.org',
    fantom: 'https://rpc.ftm.tools',
    cronos: 'https://evm.cronos.org'
});

function createEvmProviders({
    rpcUrls = DEFAULT_EVM_RPC_URLS,
    ProviderClass,
    logger = console
} = {}) {
    if (typeof ProviderClass !== 'function') {
        throw new Error('ProviderClass is required');
    }

    const providers = {};
    for (const chain of Object.keys(rpcUrls)) {
        try {
            providers[chain] = new ProviderClass(rpcUrls[chain]);
        } catch (error) {
            logger.warn(`⚠️ ${chain} Provider 初始化失败:`, error.message);
        }
    }
    logger.log('所有 EVM Provider 初始化尝试完成');
    return providers;
}

module.exports = {
    DEFAULT_EVM_RPC_URLS,
    createEvmProviders
};
