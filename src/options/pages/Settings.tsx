import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import Switch from "@mui/material/Switch";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SecurityIcon from "@mui/icons-material/Security";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import BarChartIcon from "@mui/icons-material/BarChart";
import ChangePassword from "../../components/ChangePassword";
import { useAuth } from "../../hooks/useAuth";

export default function Settings() {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);
  const [defaultCurrency, setDefaultCurrency] = React.useState("USD");

  return (
    <Box sx={{ width: "100%", maxWidth: { sm: "100%", md: "1700px" } }}>
      <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
        Settings
      </Typography>
      
      <Grid container spacing={3}>
        {/* Account Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <AccountCircleIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Account Settings</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="Display Name"
                  defaultValue={`${user?.firstName} ${user?.lastName}`.trim() || "User"}
                  variant="outlined"
                  size="small"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Email Address"
                  value={user?.email || ""}
                  variant="outlined"
                  size="small"
                  sx={{ mb: 2 }}
                  disabled
                  helperText="Email cannot be changed"
                />
                <Button 
                  variant="outlined" 
                  color="primary"
                  sx={{ mt: 1 }}
                >
                  Update Profile
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Change Password */}
        <Grid size={{ xs: 12 }}>
          <ChangePassword 
            onPasswordChanged={() => {
              console.log('Password changed successfully');
            }}
          />
        </Grid>
        
        {/* Preferences */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <VisibilityIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Preferences</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Dark Mode" 
                    secondary="Toggle between light and dark theme"
                  />
                  <Switch
                    edge="end"
                    checked={darkModeEnabled}
                    onChange={(e) => setDarkModeEnabled(e.target.checked)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <AttachMoneyIcon />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Default Currency" 
                    secondary="Set your preferred currency"
                  />
                  <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={defaultCurrency}
                      onChange={(e) => setDefaultCurrency(e.target.value as string)}
                    >
                      <MenuItem value="USD">USD ($)</MenuItem>
                      <MenuItem value="EUR">EUR (€)</MenuItem>
                      <MenuItem value="GBP">GBP (£)</MenuItem>
                      <MenuItem value="JPY">JPY (¥)</MenuItem>
                      <MenuItem value="CAD">CAD ($)</MenuItem>
                    </Select>
                  </FormControl>
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Default Date Format" 
                    secondary="Choose your preferred date format"
                  />
                  <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                    <Select
                      defaultValue="MM/DD/YYYY"
                    >
                      <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                      <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                      <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                    </Select>
                  </FormControl>
                </ListItem>
              </List>
            </CardContent>
          </Card>
          
          {/* Notifications */}
          <Card variant="outlined" sx={{ mt: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <NotificationsIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Notifications</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                  />
                }
                label="Enable Notifications"
              />
              
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Position Alerts" 
                    secondary="Notify when positions change significantly"
                  />
                  <Switch defaultChecked disabled={!notificationsEnabled} />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Expiration Reminders" 
                    secondary="Notify before options expiry"
                  />
                  <Switch defaultChecked disabled={!notificationsEnabled} />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Market News" 
                    secondary="Receive market updates relevant to your portfolio"
                  />
                  <Switch disabled={!notificationsEnabled} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Trading Preferences */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <BarChartIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Trading Preferences</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel>Default Chart Time Period</InputLabel>
                <Select
                  defaultValue="1M"
                  label="Default Chart Time Period"
                >
                  <MenuItem value="1W">1 Week</MenuItem>
                  <MenuItem value="1M">1 Month</MenuItem>
                  <MenuItem value="3M">3 Months</MenuItem>
                  <MenuItem value="6M">6 Months</MenuItem>
                  <MenuItem value="1Y">1 Year</MenuItem>
                  <MenuItem value="ALL">All Time</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel>Default Options Expiration View</InputLabel>
                <Select
                  defaultValue="monthly"
                  label="Default Options Expiration View"
                >
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="all">All Available</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth margin="normal" size="small">
                <InputLabel>Risk Tolerance</InputLabel>
                <Select
                  defaultValue="moderate"
                  label="Risk Tolerance"
                >
                  <MenuItem value="conservative">Conservative</MenuItem>
                  <MenuItem value="moderate">Moderate</MenuItem>
                  <MenuItem value="aggressive">Aggressive</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Security */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <SecurityIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Security</Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />
              
              <List>
                <ListItem>
                  <ListItemText 
                    primary="Two-Factor Authentication" 
                    secondary="Add an extra layer of security"
                  />
                  <Switch />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Session Timeout" 
                    secondary="Automatically log out after inactivity"
                  />
                  <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
                    <Select
                      defaultValue={30}
                    >
                      <MenuItem value={15}>15 minutes</MenuItem>
                      <MenuItem value={30}>30 minutes</MenuItem>
                      <MenuItem value={60}>1 hour</MenuItem>
                      <MenuItem value={120}>2 hours</MenuItem>
                      <MenuItem value={0}>Never</MenuItem>
                    </Select>
                  </FormControl>
                </ListItem>
              </List>
              
              <Box sx={{ mt: 2 }}>
                <Button 
                  variant="outlined" 
                  color="primary"
                  sx={{ mr: 2 }}
                >
                  View Login History
                </Button>
                <Button 
                  variant="outlined" 
                  color="error"
                >
                  Log Out All Devices
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
