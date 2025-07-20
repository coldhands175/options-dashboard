import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Badge from "@mui/material/Badge";
import MenuItem from "@mui/material/MenuItem";
import Menu from "@mui/material/Menu";
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircle from "@mui/icons-material/AccountCircle";
import NotificationsIcon from "@mui/icons-material/Notifications";
import MoreIcon from "@mui/icons-material/MoreVert";
import LogoutIcon from "@mui/icons-material/Logout";
import { alpha } from "@mui/material/styles";
import { useAuth } from "../../context/AuthContext";
import StockSearch, { StockSymbol } from "../../components/StockSearch";
import { stockApi, StockQuote } from "../../services/stockApi";
import { Card, CardContent, Fade, Popper, CircularProgress } from "@mui/material";


export default function OptionsAppNavbar() {
  const { user, logout } = useAuth();
  const [selectedStock, setSelectedStock] = React.useState<StockSymbol | null>(null);
  const [stockQuote, setStockQuote] = React.useState<StockQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = React.useState(false);
  const [showQuote, setShowQuote] = React.useState(false);
  const [quoteAnchorEl, setQuoteAnchorEl] = React.useState<HTMLElement | null>(null);
  
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileMoreAnchorEl, setMobileMoreAnchorEl] =
    React.useState<null | HTMLElement>(null);

  const isMenuOpen = Boolean(anchorEl);
  const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMoreAnchorEl(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    handleMobileMenuClose();
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMoreAnchorEl(event.currentTarget);
  };

  // Fetch stock quote when a symbol is selected
  const fetchStockQuote = async (symbol: StockSymbol) => {
    setQuoteLoading(true);
    setStockQuote(null);
    try {
      const quote = await stockApi.getQuote(symbol.ticker);
      setStockQuote(quote);
      setShowQuote(true);
      
      // Auto-hide quote after 10 seconds
      setTimeout(() => {
        setShowQuote(false);
      }, 10000);
    } catch (error) {
      console.error('Failed to fetch stock quote:', error);
      // Still show basic info even if quote fails
      setStockQuote({
        ticker: symbol.ticker,
        name: symbol.name,
        price: 0,
        change: 0,
        changePercent: 0,
        updatedAt: new Date().toISOString(),
      });
      setShowQuote(true);
      setTimeout(() => setShowQuote(false), 5000);
    } finally {
      setQuoteLoading(false);
    }
  };

  const menuId = "primary-search-account-menu";
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      id={menuId}
      keepMounted
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
      <MenuItem onClick={handleMenuClose}>My account</MenuItem>
      <MenuItem onClick={handleMenuClose}>Settings</MenuItem>
      <MenuItem onClick={handleLogout}>
        <LogoutIcon sx={{ mr: 1 }} />
        Logout
      </MenuItem>
    </Menu>
  );

  const mobileMenuId = "primary-search-account-menu-mobile";
  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMoreAnchorEl}
      anchorOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      id={mobileMenuId}
      keepMounted
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      open={isMobileMenuOpen}
      onClose={handleMobileMenuClose}
    >
      <MenuItem>
        <IconButton
          size="large"
          aria-label="show new notifications"
          color="inherit"
        >
          <Badge badgeContent={5} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <p>Notifications</p>
      </MenuItem>
      <MenuItem onClick={handleProfileMenuOpen}>
        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="primary-search-account-menu"
          aria-haspopup="true"
          color="inherit"
        >
          <AccountCircle />
        </IconButton>
        <p>Profile</p>
      </MenuItem>
    </Menu>
  );

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          backgroundColor: (theme) =>
            alpha(theme.palette.background.default, 0.72),
          boxShadow: (theme) =>
            `inset 0px -1px 1px ${
              theme.palette.mode === "dark"
                ? theme.palette.primaryDark[700]
                : theme.palette.grey[100]
            }`,
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: { md: `calc(100% - 240px)` },
          ml: { md: "240px" },
          color: "text.primary",
        }}
      >
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="open drawer"
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            OptionsTracker
          </Typography>
          <Box 
            data-search-container
            sx={(theme) => ({ 
            minWidth: { xs: 200, sm: 250, md: 300 },
            maxWidth: { xs: 250, sm: 300, md: 400 },
            '& .MuiTextField-root': {
              '& .MuiOutlinedInput-root': {
                backgroundColor: alpha(theme.palette.common.white, 0.15),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.common.white, 0.25),
                },
                '& fieldset': {
                  borderColor: alpha(theme.palette.common.white, 0.3),
                },
                '&:hover fieldset': {
                  borderColor: alpha(theme.palette.common.white, 0.5),
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary.main,
                },
              },
              '& .MuiInputLabel-root': {
                color: alpha(theme.palette.common.white, 0.7),
                '&.Mui-focused': {
                  color: theme.palette.primary.main,
                },
              },
              '& .MuiInputBase-input': {
                color: 'inherit',
              },
            },
          })}>
            <StockSearch
              label="Search stocks"
              placeholder="Search tickers..."
              value={selectedStock}
              onChange={setSelectedStock}
              onSymbolSelect={(symbol) => {
                console.log('Stock selected from navbar:', symbol);
                setSelectedStock(symbol);
                
                if (symbol) {
                  console.log(`✅ Selected ${symbol.ticker} - ${symbol.name}`);
                  // Set anchor element for quote popup - use the search box container
                  const searchContainer = document.querySelector('[data-search-container]') as HTMLElement;
                  setQuoteAnchorEl(searchContainer);
                  // Fetch and display quote
                  fetchStockQuote(symbol);
                }
              }}
              size="small"
            />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: { xs: "none", md: "flex" } }}>
            <IconButton
              size="large"
              aria-label="show new notifications"
              color="inherit"
            >
              <Badge badgeContent={5} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls={menuId}
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="inherit"
              title={user?.email}
            >
              <AccountCircle />
            </IconButton>
          </Box>
          <Box sx={{ display: { xs: "flex", md: "none" } }}>
            <IconButton
              size="large"
              aria-label="show more"
              aria-controls={mobileMenuId}
              aria-haspopup="true"
              onClick={handleMobileMenuOpen}
              color="inherit"
            >
              <MoreIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* Stock Quote Popup */}
      <Popper 
        open={showQuote && !!stockQuote} 
        anchorEl={quoteAnchorEl} 
        placement="bottom-start"
        transition 
        disablePortal
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={350}>
            <Card sx={{ 
              minWidth: 300, 
              mt: 1,
              boxShadow: 3,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                {quoteLoading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2">Loading quote...</Typography>
                  </Box>
                ) : stockQuote ? (
                  <>
                    <Typography variant="h6" component="div" sx={{ mb: 1 }}>
                      {stockQuote.ticker}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {stockQuote.name || selectedStock?.name}
                    </Typography>
                    <Typography variant="h5" component="div" sx={{ mb: 1 }}>
                      ${stockQuote.price.toFixed(2)}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color={stockQuote.changePercent >= 0 ? 'success.main' : 'error.main'}
                    >
                      {stockQuote.changePercent >= 0 ? '+' : ''}{stockQuote.change.toFixed(2)} 
                      ({stockQuote.changePercent >= 0 ? '+' : ''}{stockQuote.changePercent.toFixed(2)}%)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      Updated: {new Date(stockQuote.updatedAt).toLocaleTimeString()}
                    </Typography>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </Fade>
        )}
      </Popper>
      
      {renderMobileMenu}
      {renderMenu}
    </>
  );
}
