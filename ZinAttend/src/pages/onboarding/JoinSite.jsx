import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase"; // Fixed path
import { useAuth } from "../../context/AuthContext"; // Fixed path
import { Loader2, AlertCircle, CheckCircle2, QrCode } from "lucide-react";

const JoinSite = () => {
    const [searchParams] = useSearchParams();
    const code = searchParams.get("code");
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [status, setStatus] = useState("verifying"); // verifying, success, error
    const [errorMsg, setErrorMsg] = useState("");
    const [inviteData, setInviteData] = useState(null);

    useEffect(() => {
        if (authLoading) return;

        if (!user || !user.uid) {
            // Redirect to login but keep code in URL so they come back
            // Handled by Protected Route logic usually, but here specific forwarding might be nice
            // For now, assume 'Join' page is public wrapper that handles this check
            return;
        }

        const verifyInvite = async () => {
            if (!code) {
                setStatus("error");
                setErrorMsg("No invite code provided.");
                return;
            }

            try {
                // Find invite by code using Collection Group Query equivalent logic
                // Since we used a root 'invites' collection in EmployeeList.jsx, we can query it directly.
                const q = query(collection(db, "invites"), where("code", "==", code), where("status", "==", "active"));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    setStatus("error");
                    setErrorMsg("Invalid or expired invite code.");
                    return;
                }

                const inviteDoc = querySnapshot.docs[0];
                const data = inviteDoc.data();

                setInviteData({ id: inviteDoc.id, ...data });
                setStatus("ready"); // Ready to join

            } catch (err) {
                console.error("Invite check failed", err);
                setStatus("error");
                setErrorMsg("Failed to verify invite. Please try again.");
            }
        };

        verifyInvite();
    }, [code, user, authLoading]);

    const handleJoin = async () => {
        if (!inviteData || !user) return;
        setStatus("joining");

        try {
            // 1. Update User
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                role: inviteData.role,
                siteId: inviteData.siteId
            });

            // 2. Mark Invite Used
            const inviteRef = doc(db, "invites", inviteData.id);
            await updateDoc(inviteRef, {
                status: "used",
                usedBy: user.uid,
                usedAt: serverTimestamp()
            });

            // 3. Redirect
            setStatus("success");
            setTimeout(() => {
                if (inviteData.role === 'manager') navigate("/manager");
                else navigate("/employee");
                // Refresh context
                window.location.reload();
            }, 1000);

        } catch (err) {
            console.error("Join failed", err);
            setStatus("error");
            setErrorMsg("Failed to join organization.");
        }
    };

    // UI functionalities...
    // Same UI as before, just kept the component structure intact

    // UI Renders
    if (authLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;

    if (!user) {
        // Not logged in UI
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-sm w-full space-y-4">
                    <AlertCircle size={48} className="mx-auto text-blue-500" />
                    <h2 className="text-xl font-bold">Login Required</h2>
                    <p className="text-slate-600">Please login to accept this invite.</p>
                    <Link
                        to={`/login`}
                        className="block w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Login to Join
                    </Link>
                </div>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-sm w-full space-y-4">
                    <AlertCircle size={48} className="mx-auto text-rose-500" />
                    <h2 className="text-xl font-bold text-slate-800">Invite Invalid</h2>
                    <p className="text-rose-600">{errorMsg}</p>
                    <Link to="/" className="text-slate-500 hover:underline">Go Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full space-y-6 relative overflow-hidden">
                {status === "success" ? (
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 size={32} className="text-emerald-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Welcome Aboard!</h2>
                        <p className="text-slate-500">Redirecting you to your dashboard...</p>
                    </div>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                            <QrCode size={28} className="text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-2">You are invited to join</p>
                            <h2 className="text-2xl font-bold text-slate-900">{inviteData?.orgName || "Organization Hub"}</h2>
                            <p className="text-slate-500 mt-1">as <span className="font-semibold capitalize text-slate-800">{inviteData?.role}</span></p>
                        </div>

                        <div className="pt-4">
                            <button
                                onClick={handleJoin}
                                disabled={status === "joining"}
                                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                            >
                                {status === "joining" ? <Loader2 className="animate-spin" /> : "Accept Invitation"}
                            </button>
                            <p className="text-xs text-slate-400 mt-4">Signed in as {user.email}</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default JoinSite;
