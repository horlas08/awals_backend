import { config } from "dotenv";
config();

type INODE_ENV = 'DEVELOPMENT' | 'PRODUCTION';

const
    NODE_ENV: INODE_ENV = process.env.NODE_ENV as INODE_ENV,
    LOCAL_CLIENT_URL = '',
    DEPLOYED_CLIENT_URL = '',
    LOCAL_SERVER_URL = '',
    DEPLOYED_SERVER_URL = '',
    CLIENT_URL = NODE_ENV === 'DEVELOPMENT' ? LOCAL_CLIENT_URL : DEPLOYED_CLIENT_URL,
    SERVER_URL = NODE_ENV === 'DEVELOPMENT' ? LOCAL_SERVER_URL : DEPLOYED_SERVER_URL,
    PORT = process.env.PORT as string


    ;

export {
    CLIENT_URL,
    SERVER_URL,
    PORT,
}