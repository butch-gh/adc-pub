import { Backdrop, CircularProgress } from '@mui/material';

const Loader = () => {
    return(
        <>
            <Backdrop   sx={{ 
                            zIndex: (theme) => theme.zIndex.drawer + 1,
                            color: '#fff'
                        }} 
                        open={true}>
                <CircularProgress color="secondary" />
            </Backdrop>
        </>
    );
}

export default Loader;